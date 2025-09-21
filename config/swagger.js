const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI-Powered Learning Management System API',
      version: '1.0.0',
      description: `
        A comprehensive Learning Management System with AI-powered recommendations, 
        blockchain payments, and multi-channel notifications.
        
        ## Features
        - User authentication with JWT
        - Course and lesson management
        - Interactive quiz system
        - AI-powered personalized recommendations
        - Progress tracking and analytics
        - Multi-channel payment processing (traditional + blockchain)
        - Multi-channel notification system
        - File upload capabilities
        - Role-based access control
        
        ## Authentication
        Most endpoints require a Bearer token in the Authorization header:
        \`\`\`
        Authorization: Bearer <your-jwt-token>
        \`\`\`
        
        ## Rate Limiting
        API calls are rate limited to 100 requests per 15 minutes per IP address.
        
        ## Error Handling
        All errors follow a consistent format:
        \`\`\`json
        {
          "success": false,
          "message": "Error description",
          "error": "Detailed error information"
        }
        \`\`\`
        
        ## Pagination
        List endpoints support pagination with these query parameters:
        - \`page\`: Page number (default: 1)
        - \`limit\`: Items per page (default: 10, max: 50)
        
        ## File Uploads
        File upload endpoints support:
        - Images: JPG, PNG, GIF (max 5MB)
        - Videos: MP4, AVI, MOV (max 100MB)
        - Audio: MP3, WAV (max 20MB)
        - Documents: PDF, DOC, DOCX (max 10MB)
      `,
      contact: {
        name: 'API Support',
        email: 'support@learningplatform.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
        description: 'Development server'
      },
      {
        url: 'https://api.learningplatform.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  message: {
                    type: 'string',
                    example: 'Authentication required'
                  }
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  message: {
                    type: 'string',
                    example: 'Validation error'
                  },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: {
                          type: 'string'
                        },
                        message: {
                          type: 'string'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  message: {
                    type: 'string',
                    example: 'Resource not found'
                  }
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access forbidden',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  message: {
                    type: 'string',
                    example: 'Access forbidden'
                  }
                }
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  message: {
                    type: 'string',
                    example: 'Internal server error'
                  }
                }
              }
            }
          }
        }
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            default: 10
          }
        },
        SortParam: {
          name: 'sort',
          in: 'query',
          description: 'Sort order (field:asc or field:desc)',
          required: false,
          schema: {
            type: 'string',
            example: 'createdAt:desc'
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and account management'
      },
      {
        name: 'Users',
        description: 'User profile and admin management'
      },
      {
        name: 'Courses',
        description: 'Course creation, management, and enrollment'
      },
      {
        name: 'Lessons',
        description: 'Lesson content and media management'
      },
      {
        name: 'Quizzes',
        description: 'Quiz creation, submission, and grading'
      },
      {
        name: 'Progress',
        description: 'User progress tracking and analytics'
      },
      {
        name: 'AI Recommendations',
        description: 'Personalized learning recommendations'
      },
      {
        name: 'Payments',
        description: 'Payment processing and transaction management'
      },
      {
        name: 'Notifications',
        description: 'Multi-channel notification system'
      }
    ]
  },
  apis: [
    './routes/*.js',
    './models/*.js'
  ],
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai'
    },
    tryItOutEnabled: true
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info hgroup.main h2 { color: #2c5aa0 }
    .swagger-ui .info .description p { font-size: 14px; line-height: 1.5 }
    .swagger-ui .scheme-container { background: #f7f7f7; border: 1px solid #ddd }
    .swagger-ui .opblock.opblock-post { border-color: #49cc90; background: rgba(73,204,144,.1) }
    .swagger-ui .opblock.opblock-get { border-color: #61affe; background: rgba(97,175,254,.1) }
    .swagger-ui .opblock.opblock-put { border-color: #fca130; background: rgba(252,161,48,.1) }
    .swagger-ui .opblock.opblock-delete { border-color: #f93e3e; background: rgba(249,62,62,.1) }
  `,
  customSiteTitle: 'LMS API Documentation',
  customfavIcon: '/favicon.ico'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions
};
