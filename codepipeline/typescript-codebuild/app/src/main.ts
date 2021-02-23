export function handler(event: any, context: any, callback: any): void {
    console.log("value1 = " + event.key1);
    console.log("value2 = " + event.key2);  
    callback(null, "some success message");
    // or 
    // callback("some error type"); 
 };