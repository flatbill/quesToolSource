
let myFaunaCollection = 'qtSubsets'
/* Import faunaDB sdk */
const faunadb = require('faunadb')
const q = faunadb.query

exports.handler = async (event, context) => {
  /* configure faunaDB Client with our secret */
  const client = new faunadb.Client({
    secret: process.env.FAUNADB_SERVER_SECRET2
  }) 
  const myQid = event.queryStringParameters.qid ;
  console.log('myQid:',myQid)
  console.log('Netlify Function qtReadSubsets invoked.')
  console.log('here is qtReadSubsets event:', event)
  //console.log('here is qtReadSubsets event body:', event.body)
  //  console.log('qtReadSubsets event payload is:',event.payload) ?
  // let myFaunaDbName = 'alaska6'  // not needed cuz FAUNADB_SERVER_SECRET2 is tied to database alaska6.
  
/* parse the string body into a useable JS object */
//const datafromEventBody = JSON.parse(event.body)
//console.log('Function qtReadSubsets invoked. event body: ')
//console.table(event.body) 
// const qtSubsetsItem = {
//   datafromEventBody: data
// }
//return client.query(q.Create(q.Ref('classes/qtSubsets'), qtSubsetsItem))

  let myFaunaFetchQuests = 'classes/' + myFaunaCollection + '/'
  // return client.query(q.Paginate(q.Match(q.Ref('indexes/qtSubsetsX1'))))
  return client.query(q.Paginate(q.Match(q.Index('qtSubsetsX1'), myQid )))
  //q.Match(q.Index('spells_by_element'), 'fire')
    .then((response) => {
    const qtSubsetsRefs = response.data
    console.log('qtSubsets refs', qtSubsetsRefs)
    console.log(`${qtSubsetsRefs.length} qtSubsets found`)
    const getAllqtSubsetsDataQuery = qtSubsetsRefs.map((ref) => {
      return q.Get(ref)
    })
    // then query the refs
    return client.query(getAllqtSubsetsDataQuery).then((ret) => {
      return {
        statusCode: 200,
        headers: {'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify(ret)
      }
    })
  }).catch((error) => {
    console.log('error', error)
    return {
      statusCode: 400,
      body: JSON.stringify(error)
    }
  })  
}
// function getIdInline(urlPath) {
//   console.log(`Running getIdInline from Netlify Function . urlPath: ${urlPath}`)

//   return urlPath.match(/([^\/]*)\/*$/)[0]
// }