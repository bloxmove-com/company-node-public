import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService, EnvConfigService } from '@bloxmove-com/did-asset-library-core-obfuscated';
import { HttpService } from '@nestjs/axios';
import { BloxmoveTompGatewayService } from './bloxmove-tomp-gateway.service';

describe('TOMP Transport Operator Service Test', () => {
  let configService: ConfigService;
  let bloxmoveTompGatewayService: BloxmoveTompGatewayService;

  const httpMock = jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
  }))();

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      controllers: [],
      providers: [
        BloxmoveTompGatewayService,
        { provide: ConfigService, useValue: new EnvConfigService('./testfiles/localtest.env') },
        { provide: HttpService, useValue: httpMock },
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
    bloxmoveTompGatewayService = module.get<BloxmoveTompGatewayService>(BloxmoveTompGatewayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('should be defined', () => {
    it('should be defined', async () => {
      expect(bloxmoveTompGatewayService).toBeDefined();
      expect(configService).toBeDefined();
    });
  });
});
