import {ministryPlateGen} from "./functions/ministryPlateGen";
import {config as AWSConfig} from "aws-sdk";

const isOffline: boolean = (!process.env.BRANCH || process.env.BRANCH === "local");

if (isOffline) {
    AWSConfig.credentials = {
        accessKeyId: "",
        secretAccessKey: ""
    };
}

export {ministryPlateGen as handler};
