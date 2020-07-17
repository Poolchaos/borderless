import { InjectionToken } from "@angular/core";
import { IAppConfig } from "./app-config.interface";

export const APP_DI_CONFIG: IAppConfig = {
  WEB_SOCKET_CONENCTION: 'wss://657w25pko5.execute-api.us-west-2.amazonaws.com/dev',
  TURN_SERVER_IP_ADDRESS: '18.188.167.205',
  TURN_SERVER_PORT: '3478',
  TURN_SERVER_USERNAME: 'PhillipJuan',
  TURN_SERVER_PASSWORD: 'Spelunking12358'
};

export let APP_CONFIG = new InjectionToken< IAppConfig >( 'app.config' );
