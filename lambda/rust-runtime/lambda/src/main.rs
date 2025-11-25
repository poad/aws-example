use lambda_http::{Error, run, service_fn, tracing};
mod handler;
use handler::function_handler;

#[tokio::main]
async fn main() -> Result<(), Error> {
    // required to enable CloudWatch error logging by the runtime
    tracing::init_default_subscriber();

    run(service_fn(function_handler)).await
}
