import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { InMemoryDriverRepo } from './in-memory.driver.repo';

@Module({
  controllers: [DriversController],
  providers: [{ provide: DriversService, useFactory: () => new DriversService(new InMemoryDriverRepo()) }],
})
class DriversAppModule {}

async function bootstrap() {
  const app = await NestFactory.create(DriversAppModule, { cors: false });
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT ?? '8083');
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[drivers-service] up on :${port}`);
}
if (require.main === module) bootstrap();
