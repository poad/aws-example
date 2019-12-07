use lambda_runtime::{error::HandlerError, lambda, Context};
use std::error::Error;
use simple_logger;
use log::{self, error};
#[macro_use]
extern crate serde_derive;
use simple_error::bail;

#[derive(Deserialize, Clone)]
struct CustomEvent {
    #[serde(rename = "name")]
    name: String,
}
 
#[derive(Serialize, Clone)]
struct CustomOutput {
    message: String,
}

fn main() -> Result<(), Box<dyn Error>> {
    simple_logger::init_with_level(log::Level::Debug)?;
    lambda!(handler);

    Ok(())
}

fn handler(
    event: CustomEvent,
    context: Context,
) -> Result<CustomOutput, HandlerError> {
    if event.name == "" {
        error!("Empty name in request {}", context.aws_request_id);
        bail!("Empty name");
    }

    Ok(CustomOutput {
        message: format!("Hello, {}!", event.name),
    })
}