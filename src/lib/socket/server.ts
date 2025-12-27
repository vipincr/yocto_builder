import { Server as HTTPServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from './events';
import { prisma } from '@/lib/db/client';

let ioInstance: SocketServer<ClientToServerEvents, ServerToClientEvents> | null = null;

export function createSocketServer(httpServer: HTTPServer): SocketServer<ClientToServerEvents, ServerToClientEvents> {
  if (ioInstance) {
    return ioInstance;
  }

  const io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Namespace for builds
  const buildsNs = io.of('/builds');
  
  buildsNs.on('connection', async (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Authentication - in production, verify session token
    const token = socket.handshake.auth.token;
    if (!token) {
      socket.emit('error', { message: 'Authentication required', code: 'AUTH_REQUIRED' });
      socket.disconnect();
      return;
    }

    // TODO: Verify session token with NextAuth
    // For now, we'll trust the token
    
    socket.on('build:subscribe', async (buildId) => {
      try {
        // Verify user has access to this build
        const build = await prisma.build.findUnique({
          where: { id: buildId },
          include: {
            branch: {
              include: {
                project: true,
              },
            },
          },
        });

        if (!build) {
          socket.emit('error', { message: 'Build not found', code: 'NOT_FOUND' });
          return;
        }

        // TODO: Verify user has access to this project
        // For now, allow subscription

        socket.join(`build:${buildId}`);
        console.log(`Client ${socket.id} subscribed to build ${buildId}`);
      } catch (error: any) {
        socket.emit('error', { message: error.message, code: 'SUBSCRIPTION_ERROR' });
      }
    });
    
    socket.on('build:unsubscribe', (buildId) => {
      socket.leave(`build:${buildId}`);
      console.log(`Client ${socket.id} unsubscribed from build ${buildId}`);
    });
    
    socket.on('project:subscribe', async (projectId) => {
      try {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          socket.emit('error', { message: 'Project not found', code: 'NOT_FOUND' });
          return;
        }

        // TODO: Verify user has access
        socket.join(`project:${projectId}`);
        console.log(`Client ${socket.id} subscribed to project ${projectId}`);
      } catch (error: any) {
        socket.emit('error', { message: error.message, code: 'SUBSCRIPTION_ERROR' });
      }
    });
    
    socket.on('project:unsubscribe', (projectId) => {
      socket.leave(`project:${projectId}`);
    });
    
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
}

export function getSocketServer(): SocketServer<ClientToServerEvents, ServerToClientEvents> | null {
  return ioInstance;
}

// Emit functions for build service
export function emitBuildLog(
  io: SocketServer<ClientToServerEvents, ServerToClientEvents>,
  buildId: string,
  log: any
): void {
  io.of('/builds').to(`build:${buildId}`).emit('build:log', log);
}

export function emitBuildProgress(
  io: SocketServer<ClientToServerEvents, ServerToClientEvents>,
  buildId: string,
  progress: any
): void {
  io.of('/builds').to(`build:${buildId}`).emit('build:progress', progress);
}

export function emitBuildQueued(
  io: SocketServer<ClientToServerEvents, ServerToClientEvents>,
  buildId: string,
  data: any
): void {
  io.of('/builds').to(`build:${buildId}`).emit('build:queued', data);
}

export function emitBuildStarted(
  io: SocketServer<ClientToServerEvents, ServerToClientEvents>,
  buildId: string,
  data: any
): void {
  io.of('/builds').to(`build:${buildId}`).emit('build:started', data);
}

export function emitBuildCompleted(
  io: SocketServer<ClientToServerEvents, ServerToClientEvents>,
  buildId: string,
  data: any
): void {
  io.of('/builds').to(`build:${buildId}`).emit('build:completed', data);
}

export function emitBuildCancelled(
  io: SocketServer<ClientToServerEvents, ServerToClientEvents>,
  buildId: string,
  data: any
): void {
  io.of('/builds').to(`build:${buildId}`).emit('build:cancelled', data);
}

