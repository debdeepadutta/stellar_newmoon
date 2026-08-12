fetch('https://indexer.preview.midnight.network/api/v4/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query {
        transactions(filter: { hash: { equalTo: "3365cc69ebac39dadf6a0c83e57c4238243cf8f7bb4439b5850c14ef35501a52" } }) {
          nodes {
            contractActions {
              nodes {
                address
              }
            }
          }
        }
      }
    `
  })
}).then(r => r.json()).then(r => console.dir(r, {depth: null})).catch(console.error);
