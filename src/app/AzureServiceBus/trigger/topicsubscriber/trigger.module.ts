import {HttpModule} from "@angular/http";
import {NgModule} from "@angular/core";
import {
    TopicSubscriberHandler,
} from "./trigger";
import {WiServiceContribution} from "wi-studio/app/contrib/wi-contrib";

@NgModule({
    imports: [
        HttpModule,
    ],
    exports: [],
    declarations: [],
    entryComponents: [],
    providers: [
        {
            provide: WiServiceContribution,
            useClass: TopicSubscriberHandler
        }
    ],
    bootstrap: []
})
export default class TopicSubscriberModule {

}
