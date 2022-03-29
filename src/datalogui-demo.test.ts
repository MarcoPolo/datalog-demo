import * as datalog from '@datalogui/datalog'

test("Hello World", () => {
  // Build our data tables
  const Greetings = datalog.intoTable([
    { language: "en", greeting: "Hello" },
    { language: "es", greeting: "Hola" }
    // ...
  ])
  const Nouns = datalog.intoTable([
    { language: "en", noun: "world" },
    { language: "es", noun: "todos" }
    // ...
  ])

  // Query our data for English Greetings
  const GreetingQuery = datalog.query<{ greeting: string, noun: string }>(({ greeting, noun }) => {
    Greetings({ language: 'en', greeting })
    Nouns({ language: 'en', noun })
  })


  expect(
    GreetingQuery.view().readAllData()
  ).toEqual(
    [{ greeting: 'Hello', noun: 'world' }]
  )
})
