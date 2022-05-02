import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@bloxmove-com/did-asset-library-core-obfuscated';

import { IServiceCatalogEntry, IUsageData, IVehicleContractData } from '../common/interfaces/interfaces';
import { DoorStatus } from '../common/enums';
import { lastValueFrom, map } from 'rxjs';

@Injectable()
export class BloxmoveTompGatewayService {
  private readonly bloxmoveTompGatewayBaseUrl: string;
  private readonly logger = new Logger();

  constructor(private config: ConfigService, private httpService: HttpService) {
    this.bloxmoveTompGatewayBaseUrl = this.config.get('bloxmoveTompGatewayBaseUrl');
  }

  public async requestBooking(assetId: string): Promise<IVehicleContractData> {
    const url = this.bloxmoveTompGatewayBaseUrl + '/create-booking/';

    const createBookingRequest = {
      assetId,
    };

    this.logger.debug('Booking request to TO:');
    this.logger.debug(createBookingRequest);

    try {
      const httpResult = await lastValueFrom(this.httpService.post(url, createBookingRequest).pipe(map((res) => res.data)));
      this.logger.debug(`A booking has been requested for assetId: ${assetId}`);

      return httpResult;
    } catch (error) {
      this.logger.error('Error by request booking', error);
      throw error;
    }
  }

  public async confirmBooking(bookingId: string): Promise<void> {
    const url = this.bloxmoveTompGatewayBaseUrl + '/confirm-booking/';

    const confirmBookingRequest = {
      bookingId,
    };

    this.logger.debug('Confirm request to TO:');
    this.logger.debug(confirmBookingRequest);

    try {
      const httpResult = await lastValueFrom(this.httpService.post(url, confirmBookingRequest).pipe(map((res) => res.data)));
      this.logger.debug(`A booking has been confirmed for bookingId: ${bookingId}`);

      return httpResult;
    } catch (error) {
      this.logger.error('Error by confirming booking', error);
      throw error;
    }
  }

  public async endBooking(bookingId: string): Promise<IUsageData> {
    const url = this.bloxmoveTompGatewayBaseUrl + '/end-booking/';

    const endBookingRequest = {
      bookingId,
    };

    this.logger.debug('End booking request:');
    this.logger.debug(endBookingRequest);

    try {
      const httpResult = await lastValueFrom(this.httpService.post(url, endBookingRequest).pipe(map((res) => res.data)));
      this.logger.debug(`A booking has been finished for bookingId: ${bookingId}`);

      return httpResult;
    } catch (error) {
      this.logger.error('Error by finishing booking', error);
      throw error;
    }
  }

  public async changeDoorStatus(bookingId: string, doorStatus: DoorStatus): Promise<void> {
    const url = this.bloxmoveTompGatewayBaseUrl + '/change-door-status/';

    const changeDoorStatusRequest = {
      bookingId,
      doorStatus,
    };

    this.logger.debug('Change door status:');
    this.logger.debug(changeDoorStatusRequest);

    try {
      const httpResult = await lastValueFrom(this.httpService.post(url, changeDoorStatusRequest).pipe(map((res) => res.data)));
      this.logger.debug(`The door status has been changed for bookingId: ${bookingId}`);

      return httpResult;
    } catch (error) {
      this.logger.error('Error by confirming booking', error);
      throw error;
    }
  }

  public async getTompServiceCatalog(): Promise<IServiceCatalogEntry[]> {
    const url = this.bloxmoveTompGatewayBaseUrl + '/service-catalog/';

    this.logger.log('Request tomp service catalog:');

    try {
      const httpResult = await lastValueFrom(this.httpService.get(url).pipe(map((res) => res.data)));
      this.logger.debug(`The tomp service-catalog has been requested`);

      return httpResult;
    } catch (error) {
      this.logger.error('Error by requesting tomp service-catalog', error);
      throw error;
    }
  }
}
