import { Component, OnInit, Inject } from '@angular/core';
import { APP_CONFIG } from './app-config/app-config.constants';
import { IAppConfig } from './app-config/app-config.interface';

import { ConnectionService } from './connection.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'borderless';

  constructor(@Inject( APP_CONFIG ) private config: IAppConfig, private service: ConnectionService) {}

  ngOnInit() {
    this.service.disableAllButtons();
    this.service.getLocalWebCamFeed();
  }

  public call(): void {
    this.service.createAndSendOffer();
  }

  public answer(): void {
    this.service.createAndSendAnswer();
  }

  public endCall(): void {
    this.service.disconnectRTCPeerConnection();
  }

  public sendMessage(): void {
    this.service.sendMessage();
  }

  public switchMobileCamera(): void {
    this.service.switchMobileCamera();
  }
}
