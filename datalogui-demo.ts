const datalog = require('@datalogui/datalog')

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
const GreetingQuery = datalog.query(({ greeting, noun }) => {
  Greetings({ language: 'en', greeting })
  Nouns({ language: 'en', noun })
})

GreetingQuery.view().readAllData()
