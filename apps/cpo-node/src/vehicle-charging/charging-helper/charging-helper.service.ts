import { Logger, Injectable } from '@nestjs/common';
import { ICallbackUrl } from '../../common/interfaces/interfaces';

@Injectable()
export class ChargingHelperService {
  private readonly logger = new Logger(ChargingHelperService.name);

  public createExchangePayloadForSessionStart(exchangeId: string, evseId: string, timeStamp: string, callbackUrls: ICallbackUrl[]) {
    const payload = {
      exchangeId,
      interactServices: [
        {
          type: 'UnmediatedHttpPresentationService2021',
        },
      ],
      query: [
        {
          type: 'PresentationDefinition',
          credentialQuery: [
            {
              presentationDefinition: {
                id: exchangeId,
                input_descriptors: [
                  {
                    id: 'energy_supplier_customer_contract',
                    name: 'Energy Supplier Customer Contract',
                    purpose: 'An energy supplier contract is needed for Rebeam authorization',
                    constraints: {
                      fields: [
                        {
                          path: ['$.credentialSubject.role.namespace'],
                          filter: {
                            type: 'string',
                            const: 'customer.roles.rebeam.apps.eliagroup.iam.ewc',
                          },
                        },
                      ],
                    },
                  },
                  {
                    id: 'charging_data',
                    name: 'Data needs to be signed by the user',
                    purpose: 'Data needs to be signed by the user to start the charging',
                    constraints: {
                      subject_is_issuer: 'required',
                      fields: [
                        {
                          path: ['$.credentialSubject.chargingData.contractDID'],
                          filter: {
                            type: 'string',
                            const: exchangeId,
                          },
                        },
                        {
                          path: ['$.credentialSubject.chargingData.evseId'],
                          filter: {
                            type: 'string',
                            const: evseId,
                          },
                        },
                        {
                          path: ['$.credentialSubject.chargingData.timeStamp'],
                          filter: {
                            type: 'string',
                            const: timeStamp,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
      isOneTime: true,
      callback: callbackUrls,
    };
    return payload;
  }

  public createExchangePayloadForSessionEnd(exchangeId: string, evseId: string, timeStamp: string, kwh: string, callbackUrls: ICallbackUrl[]) {
    const payload = {
      exchangeId: `${exchangeId}end`,
      interactServices: [
        {
          type: 'UnmediatedHttpPresentationService2021',
        },
      ],
      query: [
        {
          type: 'PresentationDefinition',
          credentialQuery: [
            {
              presentationDefinition: {
                id: exchangeId,
                input_descriptors: [
                  {
                    id: 'charging_data',
                    name: 'Data needs to be signed by the user',
                    purpose: 'Data needs to be signed by the user to end the charging',
                    constraints: {
                      subject_is_issuer: 'required',
                      fields: [
                        {
                          path: ['$.credentialSubject.chargingData.contractDID'],
                          filter: {
                            type: 'string',
                            const: exchangeId,
                          },
                        },
                        {
                          path: ['$.credentialSubject.chargingData.evseId'],
                          filter: {
                            type: 'string',
                            const: evseId,
                          },
                        },
                        {
                          path: ['$.credentialSubject.chargingData.timeStamp'],
                          filter: {
                            type: 'string',
                            const: timeStamp,
                          },
                        },
                        {
                          path: ['$.credentialSubject.chargingData.kwh'],
                          filter: {
                            type: 'string',
                            const: kwh,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
      isOneTime: true,
      callback: callbackUrls,
    };
    return payload;
  }
}
