package com.project.urp.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

/**
 * Unit tests for {@link DatabaseUrlEnvironmentPostProcessor}. The processor
 * itself never touches a Spring context, so we exercise it directly with a
 * {@link StandardEnvironment} seeded with a fake DATABASE_URL.
 */
class DatabaseUrlEnvironmentPostProcessorTest {

    private final DatabaseUrlEnvironmentPostProcessor processor =
            new DatabaseUrlEnvironmentPostProcessor();

    @Test
    @DisplayName("parses Fly-style DATABASE_URL into DB_URL/DB_USERNAME/DB_PASSWORD")
    void parses_fly_url() {
        StandardEnvironment env = envWith("DATABASE_URL",
                "postgres://flyuser:s3cr3tP@somehost.flycast:5432/patientinfo?sslmode=disable");

        processor.postProcessEnvironment(env, null);

        assertThat(env.getProperty("DB_URL"))
                .isEqualTo("jdbc:postgresql://somehost.flycast:5432/patientinfo?sslmode=disable");
        assertThat(env.getProperty("DB_USERNAME")).isEqualTo("flyuser");
        assertThat(env.getProperty("DB_PASSWORD")).isEqualTo("s3cr3tP");
    }

    @Test
    @DisplayName("defaults port to 5432 when DATABASE_URL omits it")
    void defaults_port_when_missing() {
        StandardEnvironment env = envWith("DATABASE_URL",
                "postgres://u:p@host/db");

        processor.postProcessEnvironment(env, null);

        assertThat(env.getProperty("DB_URL"))
                .isEqualTo("jdbc:postgresql://host:5432/db");
    }

    @Test
    @DisplayName("explicit DB_URL wins over DATABASE_URL (dev profile preserved)")
    void explicit_db_url_wins() {
        StandardEnvironment env = new StandardEnvironment();
        Map<String, Object> seed = new HashMap<>();
        seed.put("DATABASE_URL", "postgres://other:other@nope:5432/nope");
        seed.put("DB_URL", "jdbc:mariadb://localhost:3306/dev");
        seed.put("DB_USERNAME", "dev");
        seed.put("DB_PASSWORD", "devpass");
        env.getPropertySources().addFirst(new MapPropertySource("seed", seed));

        processor.postProcessEnvironment(env, null);

        assertThat(env.getProperty("DB_URL")).isEqualTo("jdbc:mariadb://localhost:3306/dev");
        assertThat(env.getProperty("DB_USERNAME")).isEqualTo("dev");
    }

    @Test
    @DisplayName("no-op when DATABASE_URL is absent (tests / local non-Fly)")
    void noop_when_absent() {
        StandardEnvironment env = new StandardEnvironment();
        processor.postProcessEnvironment(env, null);
        assertThat(env.getProperty("DB_URL")).isNull();
    }

    @Test
    @DisplayName("no-op for non-postgres URLs (defensive)")
    void noop_for_non_postgres() {
        StandardEnvironment env = envWith("DATABASE_URL", "mysql://u:p@h/db");
        processor.postProcessEnvironment(env, null);
        assertThat(env.getProperty("DB_URL")).isNull();
    }

    @Test
    @DisplayName("no-op when DATABASE_URL has no user info")
    void noop_when_no_userinfo() {
        StandardEnvironment env = envWith("DATABASE_URL", "postgres://host:5432/db");
        processor.postProcessEnvironment(env, null);
        assertThat(env.getProperty("DB_URL")).isNull();
    }

    private static StandardEnvironment envWith(String key, String value) {
        StandardEnvironment env = new StandardEnvironment();
        Map<String, Object> seed = new HashMap<>();
        seed.put(key, value);
        env.getPropertySources().addFirst(new MapPropertySource("seed", seed));
        return env;
    }
}
