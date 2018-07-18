
fetch = (message) => {
  console.log(`fetching from backend: ${message}`);
}

source = () => {
  let message = "from input source";
  inside = {
    transform: (dotransform) => {
      dotransform(message);
    }
  }
  return inside;
}

function search(source$, fetch$) {
  source$().transform(fetch$);
}


search(source, data => {
    console.log(`ahah good ${data}`);
})

search(source, fetch);
