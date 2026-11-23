package com.jfmprinthub.config;

import com.jfmprinthub.security.JsonAuthErrorHandlers;
import com.jfmprinthub.security.OwnerAuthorizationManager;
import com.jfmprinthub.security.PublicRateLimitFilter;
import com.nimbusds.jwt.JWTParser;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.text.ParseException;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final AppProperties props;
    private final OwnerAuthorizationManager ownerAuthorizationManager;
    private final PublicRateLimitFilter publicRateLimitFilter;
    private final JsonAuthErrorHandlers errorHandlers;
    private final CorsConfigurationSource corsConfigurationSource;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .requestMatchers("/api/v1/**").access(ownerAuthorizationManager)
                .anyRequest().denyAll())
            .oauth2ResourceServer(oauth -> oauth
                .jwt(jwt -> jwt.decoder(jwtDecoder()))
                .authenticationEntryPoint(errorHandlers)
                .accessDeniedHandler(errorHandlers))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(errorHandlers)
                .accessDeniedHandler(errorHandlers))
            .addFilterBefore(publicRateLimitFilter, BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    /** Accepts both Supabase schemes: ES256/RS256 via JWKS, and legacy HS256 via SUPABASE_JWT_SECRET. */
    @Bean
    JwtDecoder jwtDecoder() {
        AppProperties.Supabase sb = props.supabase();

        OAuth2TokenValidator<Jwt> audience = jwt -> jwt.getAudience() != null && jwt.getAudience().contains("authenticated")
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid audience", null));
        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(sb.issuer()), audience);

        NimbusJwtDecoder asymmetric = NimbusJwtDecoder.withJwkSetUri(sb.resolvedJwksUrl())
                .jwsAlgorithm(SignatureAlgorithm.ES256)
                .jwsAlgorithm(SignatureAlgorithm.RS256)
                .build();
        asymmetric.setJwtValidator(validator);

        NimbusJwtDecoder hmac = null;
        if (sb.usesLegacySecret()) {
            SecretKeySpec key = new SecretKeySpec(sb.jwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
            hmac.setJwtValidator(validator);
        }
        final NimbusJwtDecoder symmetric = hmac;

        return token -> {
            String alg;
            try {
                alg = JWTParser.parse(token).getHeader().getAlgorithm().getName();
            } catch (ParseException e) {
                throw new BadJwtException("Malformed token", e);
            }
            if (alg.startsWith("HS")) {
                if (symmetric == null) {
                    throw new BadJwtException("Token is signed with the legacy HS256 secret. Set SUPABASE_JWT_SECRET "
                            + "(Supabase → Project Settings → JWT Keys → Legacy JWT Secret).");
                }
                return symmetric.decode(token);
            }
            return asymmetric.decode(token);
        };
    }
}