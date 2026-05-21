package com.project.urp.controller;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.persistence.EntityNotFoundException;

/**
 * Centralized HTTP error mapping. Goals:
 *   - Service layer throws {@link IllegalArgumentException} for the various
 *     "invalid patient id / invalid measurement id" cases — surface those as
 *     400 (or 404 when the prefix indicates a missing-entity semantic)
 *     instead of leaking to Spring's default whitelabel page.
 *   - JPA's {@link EntityNotFoundException} maps to 404.
 *   - Malformed JSON / type mismatches / unsupported methods get specific
 *     4xx codes so the frontend's status-keyed messages render the right
 *     toast.
 *   - The response body intentionally never includes the exception message
 *     — Spring's "Invalid patient Id: p001" messages historically leaked
 *     patient identifiers; we log them server-side but return only a
 *     generic, status-keyed string.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Validation-shaped IllegalArgumentExceptions from the service layer.
     * Distinguish "not found" semantics by message prefix so callers see
     * 404 instead of a misleading 400.
     *
     * Logging: only the exception class and status are emitted at WARN
     * because the message text typically contains a patient identifier
     * (e.g., "Invalid patient Id: p001"). Even on a clinic-LAN deployment
     * the operator log is not a controlled-access PII sink — see
     * IMPL_SPEC §8.11.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        String msg = ex.getMessage() == null ? "" : ex.getMessage();
        boolean notFound = msg.startsWith("Invalid patient Id")
                || msg.startsWith("Invalid measurement Id");
        HttpStatus status = notFound ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
        log.warn("[{}] IllegalArgumentException (message suppressed for PII)", status.value());
        return error(status);
    }

    /**
     * Race-condition or future-schema duplicate / FK / NOT NULL violations
     * surface as 409 Conflict instead of a generic 500.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("[409] DataIntegrityViolationException: {}", ex.getMostSpecificCause().getClass().getSimpleName());
        return error(HttpStatus.CONFLICT);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleEntityNotFound(EntityNotFoundException ex) {
        // ex.getMessage() typically contains the entity class name and id —
        // both internal schema detail. Log class only, consistent with the
        // other handlers in this advice.
        log.warn("[404] EntityNotFoundException class={}", ex.getClass().getSimpleName());
        return error(HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResource(NoResourceFoundException ex) {
        log.warn("[404] NoResourceFoundException: {}", ex.getResourcePath());
        return error(HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        // ex.getMessage() leaks a fragment of the attacker-controlled request
        // body (Jackson includes the offending token). Log the cause class only.
        log.warn("[400] HttpMessageNotReadableException cause={}",
                ex.getMostSpecificCause().getClass().getSimpleName());
        return error(HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.warn("[400] MethodArgumentTypeMismatchException: param={}, requiredType={}",
                ex.getName(), ex.getRequiredType());
        return error(HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        log.warn("[422] MethodArgumentNotValidException: {} field error(s)",
                ex.getBindingResult().getFieldErrorCount());
        return error(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex) {
        log.warn("[405] HttpRequestMethodNotSupportedException: {}", ex.getMessage());
        return error(HttpStatus.METHOD_NOT_ALLOWED);
    }

    /**
     * Spring's async request timeout — map to 503 (Service Unavailable)
     * instead of being swallowed by the generic Exception 500 fallback.
     */
    @ExceptionHandler(AsyncRequestTimeoutException.class)
    public ResponseEntity<Map<String, Object>> handleAsyncTimeout(AsyncRequestTimeoutException ex) {
        log.warn("[503] AsyncRequestTimeoutException");
        return error(HttpStatus.SERVICE_UNAVAILABLE);
    }

    /**
     * Client disconnect mid-response (Tomcat ClientAbortException, Jetty
     * EofException — both extend IOException). Common, benign network
     * event — log at WARN, no stack trace, no response (the socket is
     * already closed).
     */
    @ExceptionHandler(IOException.class)
    public ResponseEntity<Map<String, Object>> handleIo(IOException ex) {
        log.warn("[client-disconnect] {} during response", ex.getClass().getSimpleName());
        // The client cannot read the response anyway; return 500-shaped
        // envelope so the contract stays uniform if the write does land.
        return error(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleFallback(Exception ex) {
        log.error("[500] Unhandled exception", ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private static ResponseEntity<Map<String, Object>> error(HttpStatus status) {
        Map<String, Object> body = Map.of(
                "status", status.value(),
                "error", status.getReasonPhrase(),
                "timestamp", OffsetDateTime.now().toString());
        return ResponseEntity.status(status).body(body);
    }
}
