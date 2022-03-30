import * as datalogUI from '@datalogui/datalog'

const People = datalogUI.intoTable([
    { firstName: "Marco", lastName: "Munizaga" },
    { firstName: "Jamie", lastName: "Brandon" },
    // ...
])

test("Give me everyone's first name", () => {
    const Query = datalogUI.query(({ firstName }: { firstName: string }) => {
        People({ firstName })
    })

    expect(
        Query.view().readAllData()
    ).toEqual(
        [{ firstName: "Jamie" }, { firstName: "Marco" }]
    )
})

test("Only Munizagas", () => {
    const Query = datalogUI.query(({ firstName }: { firstName: string }) => {
        People({ firstName, lastName: "Munizaga" })
    })

    expect(
        Query.view().readAllData()
    ).toEqual(
        [{ firstName: "Marco" }]
    )
})

test("A simple join", () => {

// Build our data tables
const Greetings = datalogUI.intoTable([
    { language: "en", greeting: "Hello" },
    { language: "es", greeting: "Hola" }
    // ...
])
const Nouns = datalogUI.intoTable([
    { language: "en", noun: "world" },
    { language: "es", noun: "todos" }
    // ...
])

// Query our data for English Greetings
const GreetingQuery = datalogUI.query(({ greeting, noun }: { greeting: string, noun: string }) => {
    Greetings({ language: 'en', greeting })
    Nouns({ language: 'en', noun })
})

expect(
    GreetingQuery.view().readAllData()
).toEqual(
    [{ greeting: 'Hello', noun: 'world' }]
)

})

test("Efficient Updates examples", () => {

const Query = datalogUI.query(({ firstName }: { firstName: string }) => {
    People({ firstName })
})

const queryView = Query.view()

expect(
    queryView.readAllData()
).toEqual(
    [{ firstName: "Jamie" }, { firstName: "Marco" }]
)

People.assert({ firstName: "Frank", lastName: "McSherry" })

expect(
    queryView.recentData()
).toEqual(
    null // ??
)

Query.runQuery()

expect(
    queryView.recentData()
).toEqual(
    [{ "datum": { "firstName": "Frank" }, "kind": datalogUI.Added }]
)

People.retract({firstName: "Frank", lastName: "McSherry"})

Query.runQuery()
expect(
    queryView.recentData()
).toEqual(
    [{ "datum": { "firstName": "Frank" }, "kind": datalogUI.Removed }]
)

})

test("Only Munizagas 2", () => {

const Query = datalogUI.query(({ firstName }: { firstName: string }) => {
    People({ firstName, lastName: "Munizaga" })
})

const queryView = Query.view()

expect(
    queryView.readAllData()
).toEqual(
    [{ firstName: "Marco" }]
)

People.retract({firstName: "Jamie", lastName: "Brandon"})
Query.runQuery()

expect(
    queryView.recentData()
).toEqual(
    null
)

})

test("recursive queries", () => {
    // Build our tables
    // This represents the nodes we've seen in our traversal so far.
    // We know if a graph is connected if every node is present in this table
    const Nodes = datalogUI.newTable({
        node: datalogUI.NumberType,
    })

    // This represents the edges between nodes
    // For example {from: 1, to: 2} represents an edge from node 1 to node 2
    const Edges = datalogUI.newTable({
        from: datalogUI.NumberType,
        to: datalogUI.NumberType,
    })

    // Some initial Edges data
    const initialEdgesData = [
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5]
    ]
    initialEdgesData.forEach(([from, to]) => {
        Edges.assert({ from, to })
    })

    // We'll start the search at node 1. This could be any node
    const initialNodesData = [
        [1],
    ]
    initialNodesData.forEach(([node]) => {
        Nodes.assert({ node })
    })

    const Query = datalogUI.query(({ node, to }) => {
        Nodes({ node })
        Edges({ from: node, to })
    }).implies(({ to }) => {
        Nodes({ node: to })
    })

    // We can reach the whole graph
    expect(
        Nodes.view().readAllData().map(({node}) => node)
    ).toEqual(
        [1,2,3,4,5]
    )
})

test("bacon numbers", () => {
    const InMovie = datalogUI.intoTable([
        { MovieName: "Change of Habit", Actor: "Elvis Presley" },
        { MovieName: "Change of Habit", Actor: "Edward Asner" },
        { MovieName: "Change of Habit", Actor: "Mary Tyler Moore" },
        { MovieName: "Wild Things", Actor: "Robert Wagner" },
        { MovieName: "JFK", Actor: "Edward Asner" },
        { MovieName: "JFK", Actor: "Kevin Bacon" },
        { MovieName: "Wild Things", Actor: "Kevin Bacon" },
        // ... More Movies
    ])
    const BaconNumbers = datalogUI.intoTable([
        { Actor: "Kevin Bacon", number: 0 },
    ])

    // Initialize all actors with a bacon number of infinity
    datalogUI.query(({ BaconNumber, Actor, NextActor, MovieName }) => {
        InMovie({ Actor })
        BaconNumbers.not({ Actor })
    }).view().readAllData().map(({ Actor }) => {
        BaconNumbers.assert({ Actor, number: Infinity })
    })

    const BaconNumberQuery = datalogUI.query(({ BaconNumber, Actor, NextActor, CurrentBaconNumber, MovieName }) => {
        InMovie({ Actor, MovieName })
        InMovie({ MovieName, Actor: NextActor })
        BaconNumbers({ Actor, number: BaconNumber })
        BaconNumbers({ Actor: NextActor, number: CurrentBaconNumber })
    })

    BaconNumberQuery.viewExt()
        .mapEffect((recentDatum) => {
            // If it's a join on the same actor, we'll pass
            if (recentDatum.datum.Actor === recentDatum.datum.NextActor) {
                return
            }
            switch (recentDatum.kind) {
                case datalogUI.Added: {
                    const {
                        NextActor: Actor,
                        BaconNumber,
                        CurrentBaconNumber,
                    } = recentDatum.datum

                    if (CurrentBaconNumber > BaconNumber + 1) {
                        // We found a smaller bacon number. Let's swap out the datum
                        BaconNumbers.retract({ Actor, number: CurrentBaconNumber })
                        BaconNumbers.assert({ Actor, number: BaconNumber + 1 })
                    }
                    break
                }
                    // Ignoring this for now
                case datalogUI.Removed:
                    break;
                case datalogUI.Modified:
                    throw new Error(
                        "Unhandled. We don't expect queries to give us a modified change."
                    )
            }
        })
        .onChange(() => {
            // After we've mapped the effect, we'll run the query again to
            // update our results
            BaconNumberQuery.runQuery()
        })

    expect(
        BaconNumbers.view().readAllData()
    ).toEqual(
        [{"Actor": "Edward Asner", "number": 1}, {"Actor": "Elvis Presley", "number": 2}, {"Actor": "Kevin Bacon", "number": 0}, {"Actor": "Mary Tyler Moore", "number": 2}, {"Actor": "Robert Wagner", "number": 1}]

    )
})
