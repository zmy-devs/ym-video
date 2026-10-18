import type { FastifyInstance } from 'fastify';

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const registerErrorHandlers = (app: FastifyInstance) => {
  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({ code: 'NOT_FOUND', message: '接口不存在' });
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return reply
        .code(error.statusCode)
        .send({ code: error.code, message: error.message });
    }

    const status =
      error instanceof Error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;
    if (status >= 500) {
      console.error(
        JSON.stringify({
          event: 'api_error',
          requestId: request.id,
          route: request.routeOptions.url,
          name: error instanceof Error ? error.name : 'Error',
        }),
      );
    }
    return reply
      .code(status)
      .send({
        code: status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
        message: status >= 500 ? '服务暂时不可用' : '请求格式不正确',
      });
  });
};
