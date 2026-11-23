package com.jfmprinthub.security;

import com.jfmprinthub.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;

import java.util.function.Supplier;

/**
 * Grants access only when the authenticated JWT's {@code sub} equals the configured owner id.
 * Any other valid Supabase user receives 403 Forbidden.
 */
@Component
@RequiredArgsConstructor
public class OwnerAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {

    private final AppProperties props;

    @Override
    public AuthorizationDecision check(Supplier<Authentication> authentication, RequestAuthorizationContext ctx) {
        Authentication auth = authentication.get();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth) || !auth.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }
        String ownerId = props.owner().id();
        boolean isOwner = ownerId != null && ownerId.equalsIgnoreCase(jwtAuth.getToken().getSubject());
        return new AuthorizationDecision(isOwner);
    }
}
