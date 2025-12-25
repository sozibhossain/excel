import swaggerJsdoc from "swagger-jsdoc";

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Parcel Logistics API",
      version: "1.0.0",
      description:
        "Express + MongoDB backend for parcel logistics with RBAC, tracking, and reporting.",
    },
    servers: [{ url: "/api/v1" }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: [],
});

export default swaggerSpec;
