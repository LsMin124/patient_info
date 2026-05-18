package com.project.urp.controller;

import java.time.OffsetDateTime;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
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
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        String msg = ex.getMessage() == null ? "" : ex.getMessage();
        boolean notFound = msg.startsWith("Invalid patient Id")
                || msg.startsWith("Invalid measurement Id");
        HttpStatus status = notFound ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
        log.warn("[{}] IllegalArgumentException: {}", status.value(), msg);
        return error(status);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleEntityNotFound(EntityNotFoundException ex) {
        log.warn("[404] EntityNotFoundException: {}", ex.getMessage());
        return error(HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResource(NoResourceFoundException ex) {
        log.warn("[404] NoResourceFoundException: {}", ex.getResourcePath());
        return error(HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        log.warn("[400] HttpMessageNotReadableException: {}", ex.getMessage());
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
