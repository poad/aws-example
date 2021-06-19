use lambda_runtime::{handler_fn, Context, Error};
use log::LevelFilter;
use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use simple_logger::SimpleLogger;

#[derive(Serialize, Deserialize)]
struct HelloEvent {
    name: String,
}

async fn handler(event: Value, _: Context) -> Result<Value, Error> {
    // log::info!("event -> {}", &event);
    let body: HelloEvent = serde_json::from_str(&(&event["body"]).as_str().unwrap())?;
    let name = &body.name;
  
    let message = format!("Hello, {}!", &name);
    log::info!("{}", &message);
  
    Ok(json!({ "message": message }))
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    SimpleLogger::new()
      .with_level(LevelFilter::Info)
      .init()
      .unwrap();
  
    let func = handler_fn(handler);
    lambda_runtime::run(func).await?;
    Ok(())
}
