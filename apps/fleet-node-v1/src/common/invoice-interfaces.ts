interface IVerifiableInvoice {
  invoice: IInvoice<IMobilityBillingRecord, null> | IInvoice<IChargeBillingRecord, IChargeTimeSeries>;
  signature: string;
}

interface IInvoice<TBillingRecord, TTimeSeries> {
  finalPrice: number;
  priceComment?: string;
  billingRecord: TBillingRecord;
  timeSeries?: TTimeSeries;
}

interface IBillingRecord {
  clientDID: string;
  rentalSubjectDID: string;
  userClaims?: string[];
  businessClaims?: string[];
}

interface IMobilityBillingRecord extends IBillingRecord {
  startState: IVehicleState;
  endState: IVehicleState;

  packageId?: number;
  pricePerMinute?: number;
  pricePerKm?: number;
  termsConditions?: string;
  bookingId?: string;
  currency?: string;
}

interface IVehicleState {
  time: number;
  mileage: number;
  position: IGeoLocation;
}

interface IGeoLocation {
  lat: number;
  long: number;
}

export interface IChargeBillingRecord extends IBillingRecord {
  /** ISO-3166 alpha-2 country code of the CPO that 'owns' this CDR. */
  country_code: string;
  party_id: string;
  id: string;
  start_date_time: number;
  end_date_time: number;
  session_id: string;
  cdr_token: string;
  auth_method: string;
  authorization_reference: string;
  cdr_location: ICDRLocation;
  meter_id: string;
  currency: string;
  tariffs: ITariff[];
  charging_periods: IChargingPeriod[];
  signed_data: ISignedData;
  total_cost: number;
  total_fixed_cost: number;
  total_energy: number;
  total_energy_cost: number;
  total_time: number;
  total_time_cost: number;
  total_parking_time: number;
  total_reservation_cost: number;
  remark: string;
  invoice_reference_id: string;
  credit: boolean;
  credit_referece_id: string;
  home_charging_compensation: boolean;
  last_updated: number;
}

interface ITariff {
  /** ISO-3166 alpha-2 country code of the CPO that owns this Tariff. */
  country_code: string;
  /** ID of the CPO that 'owns' this Tariff (following the ISO-15118 standard). */
  party_id: string;
  /** Uniquely identifies the tariff within the CPO’s platform (and suboperator platforms). */
  id: string;
  /** ISO-4217 code of the currency of this tariff. */
  currency: string;
  /** Defines the type of the tariff. This allows for distinction in case of given Charging */
  type: ETariffType;
  /** Preferences. When omitted, this tariff is valid for all sessions. List of multi-language alternative tariff info texts. */
  tariff_alt_text: string;
  /** URL to a web page that contains an explanation of the tariff information in human readable form. */
  tariff_alt_url: string;
  /** When this field is set, a Charging Session with this tariff will NOT cost more than this amount. (See note below) */
  max_price: number;
  /** List of Tariff Elements. */
  elements: ITariffElement[];
  /**
   * When this field is set, a Charging Session with this tariff will at least cost this amount.
   * This is different from a FLAT fee (Start Tariff, Transaction Fee), as a FLAT fee is a fixed
   * amount that has to be paid for any Charging Session. A minimum price indicates that when the
   * cost of a Charging Session is lower than this amount, the cost of the Session will be equal
   * to this amount. (Also see note below)
   */
  min_price: number;
  /**
   * The time when this tariff becomes active, in UTC, time_zone field of the Location can be used
   * to convert to local time. Typically used for a new tariff that is already given with the location,
   * before it becomes active. (See note below)
   */
  start_date_time: number;
  /**
   * The time after which this tariff is no longer valid, in UTC, time_zone field if the Location
   * can be used to convert to local time. Typically used when this tariff is going to be replaced
   * with a different tariff in the near future. (See note below)
   */
  end_date_time: number;
  /**
   * Details on the energy supplied with this tariff.
   */
  energy_mix: IEnergyMix;
  /**
   * Timestamp when this Tariff was last updated(or created).
   */
  last_updated: number;
}

enum ETariffType {
  /**
   * Used to describe that a Tariff is valid when ad-hoc payment is used at the Charge Point
   * (for example: Debit or Credit card payment terminal).
   */
  AD_HOC_PAYMENT,
  /**
   * Used to describe that a Tariff is valid when Charging Preference:
   * CHEAP is set for the session.
   */
  PROFILE_CHEAP,
  /**
   * Used to describe that a Tariff is valid when Charging Preference:
   * FAST is set for the session.
   */
  PROFILE_FAST,
  /**
   * Used to describe that a Tariff is valid when Charging Preference:
   * GREEN is set for the session.
   */
  PROFILE_GREEN,
  /**
   * Used to describe that a Tariff is valid when using an RFID, without any Charging Preference,
   * or when Charging Preference: REGULAR is set for the session.
   */
  REGULAR,
}

interface ITariffElement {
  /** List of price components that describe the pricing of a tariff. */
  price_components: IPriceComponent[];
  /** Restrictions that describe the applicability of a tariff. */
  restrictions: ITariffRestriction[];
}

interface IPriceComponent {
  /** Type of tariff dimension. */
  type: ETariffDimensionType;
  /** Price per unit (excl. VAT) for this tariff dimension. */
  price: number;
  /**
   * Applicable VAT percentage for this tariff dimension. If omitted, no VAT is applicable.
   * Not providing a VAT is different from 0% VAT, which would be a value of 0.0 here.
   */
  vat: number;
  /**
   * Minimum amount to be billed. This unit will be billed in this step_size blocks.
   * Amounts that are less then this step_size are rounded up to the given step_size.
   * For example: if type is TIME and step_size has a value of 300, then time will be
   * billed in blocks of 5 minutes. If 6 minutes were used, 10 minutes
   * (2 blocks of step_size) will be billed.
   */
  step_size: number;
}
/**
 * These restrictions are not for the entire Charging Session. They only describe if and
 * when a TariffElement becomes active or inactive during a Charging Session.
 *
 * When more than one restriction is set, they are to be threaded as a logical AND.
 * So all need to be valid before this tariff is active.
 */
interface ITariffRestriction {
  /**
   * Sum of the maximum current (in Amperes) over all phases, for example 20. When the EV
   * is charging with less than the defined amount of current, this TariffElement becomes/is
   * active. If the charging current is or becomes higher, this TariffElement is not or no
   * longer valid and becomes inactive. This describes NOT the maximum current over the entire
   * Charging Session. This restriction can make a TariffElement become active when the charging
   * current is below this value, but the TariffElement MUST no longer be active when the
   * charging current raises above the defined value.
   */
  max_current: number;
  /**
   * Minimum power in kW, for example 5. When the EV is charging with more than, or equal to,
   * the defined amount of power, this TariffElement is/becomes active. If the charging power is
   * or becomes lower, this TariffElement is not or no longer valid and becomes inactive. This
   * describes NOT the minimum power over the entire Charging Session. This restriction can make
   * a TariffElement become active when the charging power is above this value, but the
   * TariffElement MUST no longer be active when the charging power drops below the defined
   * value.
   */
  min_power: number;
  /**
   * Maximum power in kW, for example 20. When the EV is charging with less than the defined
   * amount of power, this TariffElement becomes/is active. If the charging power is or becomes
   * higher, this TariffElement is not or no longer valid and becomes inactive. This describes
   * NOT the maximum power over the entire Charging Session. This restriction can make a
   * TariffElement become active when the charging power is below this value, but the
   * TariffElement MUST no longer be active when the charging power raises above the defined
   * value.
   */
  max_power: number;
  /**
   * Minimum duration in seconds the Charging Session MUST last (inclusive).
   * When the duration of a Charging Session is longer than the defined value, this TariffElement
   * is or becomes active. Before that moment, this TariffElement is not yet active.
   */
  min_duration: number;
  /**
   * Maximum duration in seconds the Charging Session MUST last (exclusive). When the duration
   * of a Charging Session is shorter than the defined value, this TariffElement is or becomes
   * active. After that moment, this TariffElement is no longer active.
   */
  max_duration: number;
  /** Which day(s) of the week this TariffElement is active */
  day_of_week: string;
  /**
   * When this field is present, the TariffElement describes reservation costs. A reservation
   * starts when the reservation is made, and ends when the driver starts charging on the reserved
   * EVSE/Location, or when the reservation expires. A reservation can only have: FLAT and TIME
   * TariffDimensions, where TIME is for the duration of the reservation.
   */
  reservation: EReservationRestriction;
}

enum EReservationRestriction {
  /** Used in TariffElements to describe costs for a reservation. */
  RESERVATION,
  /**
   * Used in TariffElements to describe costs for a reservation that expires (i.e. driver does not start a
   * charging session before expiry_date of the reservation).
   */
  RESERVATION_EXPIRES,
}

enum ETariffDimensionType {
  /** Defined in kWh, step_size multiplier: 1 Wh */
  ENERGY,
  /** Flat fee without unit for step_size */
  FLAT,
  /** Time not charging: defined in hours, step_size multiplier: 1 second */
  PARKING_TIME,
  /**
   * Time charging: defined in hours, step_size multiplier: 1 second
   * Can also be used in combination with a RESERVATION restriction to describe the price of the reservation time.
   */
  TIME,
}

enum ETariffType {
  /** Defined in kWh, step_size multiplier: 1 Wh */
  ENERGY = 0,
  /** Flat fee without unit for step_size */
  FLAT,
  /** Time not charging: defined in hours, step_size multiplier: 1 second */
  PARKING_TIME,
  /**
   * Time charging: defined in hours, step_size multiplier: 1 second
   * Can also be used in combination with a RESERVATION restriction to describe the price of the reservation time.
   */
  TIME,
}

interface IEnergyMix {
  /** True if 100 % from regenerative sources. (CO2 and nuclear waste is zero) */
  is_green_energy: boolean;
  /** Key-value pairs (enum + percentage) of energy sources of this location’s tariff. */
  energy_sources: IEnumSource[];
  /** Key-value pairs (enum + percentage) of nuclear waste and CO2 exhaust of this location’s tariff. */
  environ_impact: IEnvironmentalImpact[];
  /** Name of the energy supplier, delivering the energy for this location or tariff. */
  supplier_name: string;
  /** Name of the energy suppliers product/tariff plan used at this location. */
  energy_product_name: string;
}

interface IEnumSource {
  /** The type of energy source. */
  source: EEnergySourceCategory;
  /** Percentage of this source (0-100) in the mix. */
  percentage: number;
}

/**
 * Categories of energy sources.
 */
enum EEnergySourceCategory {
  /**
   * Nuclear power sources.
   */
  NUCLEAR,
  /**
   * All kinds of fossil power sources.
   */
  GENERAL_FOSSIL,
  /**
   * Fossil power from coal.
   */
  COAL,
  /**
   * Fossil power from gas.
   */
  GAS,
  /**
   * All kinds of regenerative power sources.
   */
  GENERAL_GREEN,
  /**
   * Solar power sources.
   */
  SOLAR,
  /**
   * Wind power sources.
   */
  WIND,
  /**
   * Water power sources.
   */
  WATER,
}

/**
 * Amount of waste produced/emitted per kWh.
 */
interface IEnvironmentalImpact {
  /** The environmental impact category of this value. */
  category: EEnvironmentalImpactCategory;
  /** Amount of this portion in g / kWh. */
  amount: number;
}

/**
 * Categories of environmental impact values.
 */
enum EEnvironmentalImpactCategory {
  /** Produced nuclear waste in grams per kilowatthour. */
  CARBON_DIOXIDE,
  /** Exhausted carbon dioxide in grams per kilowatthour. */
  NUCLEAR_WASTE,
}

interface ICDRLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  state: string;
  country: string;
  coordinates: IGeoLocation;
  evse_uid: string;
  evse_id: string;
  connector_id: string;
  connector_standard: string;
  connector_format: string;
  /**
   * When this CDR is created for a reservation that never resulted in a
   *  charging session, this field can be set to any value and should be ignored by the Receiver.
   */
  connector_power_type: string;
}

interface IChargingPeriod {
  /** Start timestamp of the charging period. A period ends when the next period starts. The last period ends when the session ends. */
  start_date_time: number;
  /** List of relevant values for this charging period. */
  dimensions: ICDRDimension[];
  /** Unique identifier of the Tariff that is relevant for this Charging Period. If not provided, no Tariff is relevant during this period. */
  tariff_id: string;
}

interface ICDRDimension {
  /** Average charging current during this ChargingPeriod: defined in A (Ampere). When negative, the current is flowing from the EV to the grid. */
  current: number;
  /**
   * Total amount of energy (dis-)charged during this ChargingPeriod: defined in kWh. When negative, more energy was feed
   * into the grid then charged into the EV. Default step_size is 1.
   */
  energy: number;
  energy_export: number;
  energy_import: number;
  max_current: number;
  min_current: number;
  max_power: number;
  min_power: number;
  parking_time: number;
  power: number;
  reservation_time: number;
  state_of_change: number;
  time: number;
}

interface ISignedData {
  encoding_method: string;
  encoding_method_version: number;
  public_key: string;
  signed_values: ISignedValue[];
  url: string;
}

interface ISignedValue {
  nature: string;
  plain_data: string;
  signed_data: string;
}

export interface IChargeTimeSeries {
  /**
   * Date and time at which the Charge Point has calculated this ActiveChargingProfile.
   * All time measurements within the profile are relative to this timestamp.
   */
  start_date_time: number;
  /**
   * Charging profile structure defines a list of charging periods.
   */
  charging_profile: IChargingProfile;
}

/**
 * Charging profile class defines a list of charging periods.
 */
interface IChargingProfile {
  /**
   * Starting point of an absolute profile. If absent the profile will be relative to start of charging.
   */
  start_date_time: number;
  /**
   * Duration of the charging profile in seconds. If the duration is left empty, the last period will
   * continue indefinitely or until end of the transaction in case start_date_time is absent.
   */
  duration: number;
  /** The unit of measure. */
  charging_rate_unit: EChargingRateUnit;
  /**
   * Minimum charging rate supported by the EV. The unit of measure is defined by the chargingRateUnit.
   * This parameter is intended to be used by a local smart charging algorithm to optimize the
   * power allocation for in the case a charging process is inefficient at lower charging rates.
   * Accepts at most one digit fraction (e.g. 8.1)
   */
  min_charging_rate: number;
  /** List of ChargingProfilePeriod elements defining maximum power or current usage over time. */
  charging_profile_periods: IChargingProfilePeriod[];
}

/** Charging profile period structure defines a time period in a charging profile */
interface IChargingProfilePeriod {
  /**
   * Start of the period, in seconds from the start of profile. The value of StartPeriod also defines
   * the stop time of the previous period.
   */
  start_period: number;
  /**
   * Charging rate limit during the profile period, in the applicable chargingRateUnit, for example in
   * Amperes (A) or Watts (W). Accepts at most one digit fraction (e.g. 8.1).
   */
  limit: number;
}

enum EChargingRateUnit {
  /**
   * Watts (power)
   *
   * This is the TOTAL allowed charging power. If used for AC Charging, the phase current should be calculated via:
   * Current per phase = Power / (Line Voltage * Number of Phases).
   *
   * The "Line Voltage" used in the calculation is the Line to Neutral Voltage (VLN). In Europe and Asia VLN is
   * typically 220V or 230V and the corresponding Line to Line Voltage (VLL) is 380V and 400V. The "Number of Phases"
   * is the numberPhases from the ChargingProfilePeriod. It is usually more convenient to use this for DC charging.
   *
   * Note that if numberPhases in a ChargingProfilePeriod is absent, 3 SHALL be assumed.
   */
  W,
  /**
   * Amperes (current)
   *
   * The amount of Ampere per phase, not the sum of all phases. It is usually more convenient to use this for AC charging.
   */
  A,
}

// ---------------------------------------------------------------------------------------------------------------------
// bloXmove API
// ---------------------------------------------------------------------------------------------------------------------

export interface IUsageData {
  rentalStartTime: number;
  rentalStartMileage: number;
  rentalDuration: number;
  rentalMileage: number;
  rentalEndTime: number;
  rentalEndMileage: number;
  rentalStartLocLat: number;
  rentalStartLocLong: number;
  rentalEndLocLat: number;
  rentalEndLocLong: number;
  finalPrice: number;
  priceComment?: string;
}

export interface IVehicleContractData {
  vehicleDID?: string;
  packageId?: number;
  pricePerMinute?: number;
  pricePerKm?: number;
  termsConditions?: string;
  requiredUserClaims?: string[];
  requiredBusinessClaims?: string[];
  consumerDID?: string;
  bookingId?: string;
  currency?: string;
}
