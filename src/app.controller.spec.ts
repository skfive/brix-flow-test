import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('GET /', () => {
    it('{ status: "ok" } 를 반환해야 한다', () => {
      expect(appController.getHealth()).toEqual({ status: 'ok' });
    });

    it('status 프로퍼티가 문자열이어야 한다', () => {
      const result = appController.getHealth();
      expect(typeof result.status).toBe('string');
    });
  });
});
