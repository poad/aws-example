import { hello } from "../layer/nodejs/hello"

export const handler =  async (event: any) => {
    

    hello("Hello World");
}