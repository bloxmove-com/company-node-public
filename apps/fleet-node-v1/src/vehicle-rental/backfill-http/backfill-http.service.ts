import { Logger, HttpException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  IRentalRequest,
  IRentalConfirmation,
  IRentalEndRequest,
  IUsageData,
  IContractDID,
  IAccessTokenResponse,
} from '../../common/interfaces/interfaces';

@Injectable()
export class BackfillHttpService {
  private readonly logger = new Logger(BackfillHttpService.name);

  constructor(private readonly httpService: HttpService) {}

  public async sendRentalRequestToExternalFleetNode(fleetNodeUrl: string, rentalRequest: IRentalRequest): Promise<IContractDID> {
    this.logger.log(`Send rental request to external fleetNode on Endpoint: ${fleetNodeUrl}
          to rent Vehicle with DID: ${rentalRequest.vehicleDID}`);
    const url = fleetNodeUrl + '/rental-requests';
    const options = {
      json: true,
      headers: {},
      body: rentalRequest,
    };
    return this.httpService
      .post<IContractDID>(url, rentalRequest, options)
      .toPromise()
      .then((res) => res.data)
      .catch((e) => {
        this.logger.error('Error sending rental request to external fleet node', e);
        throw new HttpException(e.response.data, e.response.status);
      });
  }

  public async sendRentalConfirmationToExternalFleetNode(fleetNodeUrl: string, rentalConfirmation: IRentalConfirmation | string): Promise<void> {
    this.logger.log(`Send rental confirmation to external fleetNode on Endpoint: ${fleetNodeUrl}`);
    const url = fleetNodeUrl + '/rental-confirmations';
    const options = {
      json: true,
      headers: {},
      body: rentalConfirmation,
    };
    return this.httpService
      .post(url, rentalConfirmation, options)
      .toPromise()
      .then((res) => res.data)
      .catch((e) => {
        this.logger.error('Error sending rental confirmation to external fleet node', e);
        throw new HttpException(e.response.data, e.response.status);
      });
  }

  public async sendRentalEndRequestToExternalFleetNode(fleetNodeUrl: string, rentalEndRequest: IRentalEndRequest): Promise<IUsageData> {
    this.logger.log(`Send rental end request to external fleetNode on Endpoint: ${fleetNodeUrl}`);
    const url = fleetNodeUrl + '/rental-end-requests';
    const options = {
      json: true,
      headers: {},
      body: rentalEndRequest,
    };
    return await this.httpService
      .post(url, rentalEndRequest, options)
      .toPromise()
      .then((res) => res.data)
      .catch((e) => {
        this.logger.error('Error sending rental end request to external fleet node', e);
        throw new HttpException(e.response.data, e.response.status);
      });
  }

  public async sendRentalEndConfirmationToExternalFleetNode(fleetNodeUrl: string, rentalEndConfirmation: IRentalConfirmation): Promise<IUsageData> {
    this.logger.log(`Send rental end confirmation to external fleetNode on Endpoint: ${fleetNodeUrl}`);
    const url = fleetNodeUrl + '/rental-end-confirmations';
    const options = {
      json: true,
      headers: {},
      body: rentalEndConfirmation,
    };
    return await this.httpService
      .post(url, rentalEndConfirmation, options)
      .toPromise()
      .then((res) => res.data)
      .catch((e) => {
        this.logger.error('Error sending rental end confirmation to external fleet node', e);
        throw new HttpException(e.response.data, e.response.status);
      });
  }

  public async getAccessTokenFromExternalFleetNode(
    fleetNodeUrl: string,
    contractDID: string,
    verifiablecredential: string,
  ): Promise<IAccessTokenResponse> {
    this.logger.log(`get accessToken for contract '${contractDID}' from external fleetNode on endpoint: ${fleetNodeUrl}`);
    const url = `${fleetNodeUrl}/rentals/${contractDID}/access-token`;
    const options = {
      json: true,
      headers: { verifiablecredential },
    };
    return await this.httpService
      .get(url, options)
      .toPromise()
      .then((res) => res.data)
      .catch((e) => {
        this.logger.error('Error sending get access token request to external fleet node', e);
        throw new HttpException(e.response.data, e.response.status);
      });
  }
}
