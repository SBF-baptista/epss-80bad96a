
export interface Accessory {
  name: string;
  quantity: number;
}

export interface Vehicle {
  brand: string;
  model: string;
  quantity: number;
  year?: string;
  accessories?: Accessory[];
}

export interface Tracker {
  model: string;
  quantity: number;
}

export const configurationTypes = [
  "HCV MERCEDES",
  "HCV VOLVO",
  "HCV SCANIA",
  "HCV DAF",
  "HCV IVECO",
  "HCV FORD",
  "LCV FIAT",
  "LCV RENAULT",
  "LCV PEUGEOT",
  "FMS250",
  "J1939 + FMS250",
  "HCV - Truck3 + FMS250",
  "OBD - BMW / LCV - BMW18",
  "LCV group - CITROEN13 / OBD - CITROEN",
  "J1939"
];

export const vehicleBrands = ["VOLKSWAGEN", "CATERPILLAR", "XCMG", "FORD", "BMW", "CITROEN", "HYUNDAI", "Mercedes-Benz", "Volvo", "Scania", "DAF", "Iveco", "Fiat", "Renault", "Peugeot"];

export const trackerModels = ["SMART5", "Ruptella Smart5", "Ruptella ECO4", "Queclink GV75", "Teltonika FMB920", "Positron PX300"];
