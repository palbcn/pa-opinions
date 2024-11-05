class Hello {
  static _hello = process.env.HELLO;
  #hello = null;
  
  constructor (hello = this.constructor._hello) {
    this.#hello = hello;     
  }
  
  get hello() {
      return this.#hello;
  }    
}

let hello = new Hello(`Hello, it's ${new Date().toLocaleTimeString()}`);

async function getHandler(event, context) {  
  try {      
    let accept = event.headers?.accept ?? "application/json";
    if (accept.includes("application/json") || accept.includes("*/*")) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ hello: hello.hello })
      }
    } else if (accept.includes("text/plain")) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/plain"
        },
        body: `Hello, ${hello.hello}!`
      }

    } else if (accept.includes("text/html")) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html"
        },
        body: `<html><body><p>Hello, ${hello.hello}!</p></body></html>`
      }
    } else {
      return { statusCode: 400, headers: { "Content-Type": "text/plain" }, body: `unsupported Accept header ${accept}` }
    }

  } catch (error) {
    return {
      statusCode: 400, headers: { "Content-Type": "text/plain" }, body: error.message
    }
  }
}

export async function handler(event, context) {
  if (event.httpMethod == "GET") {
    return await getHandler(event, context);
  } else {
    return { statusCode: 501, message: `${event.httpMethod} unsupported` }
  }
}
