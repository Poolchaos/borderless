import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { APP_CONFIG, APP_DI_CONFIG } from "./app-config/app-config.constants";


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [{
    provide: APP_CONFIG,
    useValue: APP_DI_CONFIG
  }],
  bootstrap: [AppComponent]
})
export class AppModule { }
