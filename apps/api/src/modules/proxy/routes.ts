import type { FastifyInstance } from 'fastify';
import { forwardResource } from './service';
import { proxySources } from './targets';

export const registerProxyRoutes = (app: FastifyInstance) => {
  app.get('/api/v1/proxy/sources', () => ({
    sources: proxySources.map(({ id, name }) => ({ id, name })),
  }));

  app.get<{ Params: { sourceId: string } }>(
    '/api/v1/proxy/:sourceId',
    async (request, reply) => {
      const query = new URL(request.url, 'https://api.invalid').searchParams;
      const body = await forwardResource(request.params.sourceId, query);
      return reply.type('application/json; charset=utf-8').send(body);
    },
  );
};
