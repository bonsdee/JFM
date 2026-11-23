package com.jfmprinthub.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Swagger UI at /swagger-ui.html with a Bearer (Supabase JWT) authorize button. */
@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI printHubOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("JFM PrintHub API")
                        .version("1.0.0")
                        .description("Inventory, sales and print-services management. "
                                + "Secured endpoints require the owner's Supabase access token."))
                .components(new Components().addSecuritySchemes("bearerAuth",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
