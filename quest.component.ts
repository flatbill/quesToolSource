import { Component, OnInit } from '@angular/core';
import api from 'src/utils/api'
import { makeBindingParser, ThrowStmt } from '@angular/compiler';
@Component({
  selector: 'app-quest',
  templateUrl: './quest.component.html',
  styleUrls: ['./quest.component.css']
})
export class QuestComponent implements OnInit {
  cust = '?'
  qid = '?'
  qUserId = 'FredSelzer'
  iCode = '?'
  hisAns = '0'
  hisAnsAcaIndex = 0
  hisAnsPoints = 0
  aqx = 0 // active question index
  curQuestTxt = '... loading questions ...'
  curPreQuest = ''
  curAca = []   //aca is Answer Choice Array.  One aca per question.
  qtDbDataObj: object = {}
  qtDbDataQuestNbr = '?'
  qtDbDataQuestTxt = '?'
  qtDbDataPreQuest = '?'
  qtDbDataSubset = '???'
  qtDbRef = '?'
  qtDbDataAca = [] 
  qtDbDataSeq = '?' 
  qtDbDataAcaPointVals = [] 
  qtDbDataAccum = []
  allQuestions = []
  activeQuestions = []
  showQuestHtml = true
  showAnswerGroupHtml = true 
  showWrapUpHtml = false
  showDiagHtml = true
  todaysDate = new Date().toJSON().split("T")[0];
  answerObj: object = {}
  accumObj: object = {}
  scoreObj: object = {}
  ruleObj: object = {}
  subsetObj: object = {}
  subsetArray = []  
  subsetsFromDb = []   
  subset = '???'
  accumArray = []
  timeGap = 0
  answerStartTime = performance.now()
  answerEndTime = performance.now()
  answerCnt = 0
  answerArray = []
  scoresArray = []
  scoreRound = 1
  scoreRecsWritten = 0
  rulesArray = []
  subsetToFilterIn = ''
  subsetRound = 0
  subsetTempArray = []

  //billy, maybe create question rec layout, like dateCodeCatalog.
  // right now, questions just follow the db rec layout.
  // is that good enuff, or will it be confusing later?
  // maybe related to 
  // https://forums.fauna.com/t/multi-document-upsert/488
  // maybe we want a consistent rec layout for the fauna db & here.
  // we have xxxObj in this pgm for the various arrays & db.
  // so should we have a 'type' (choke) for each kind of custom obj?
  // questObj answerObj scoreObj  accumObj ruleObj subsetObj
  // anybody writing to faunadb should use the custom obj layout.
  // in this pgm, when reading from fauna db,
  // maybe read into xxxObj first, cuz xxxObj has the rec layout.
  // in case of mismatch between fauna and this pgm,
  // we might have errors that are less weird.

  constructor() { }

  ngOnInit(): void {
    this.setQueryStringParms()
    this.launchQtRead06(Event) //fetch subsets from db
    // that chains launchQtRead05 (questions)
    //       that chains launchQtRead07 (rules) 
    //         
  // cuz of async, dont fetch more db data here.
  // hmmm.... billy maybe chain the asyn events more neatly,
  // and do it here.
  // read subsets.  when done, read rules. when done, read questions.
  // read up on technique to chain promise oriented paragraphs.
  }
  
  setQueryStringParms(){
    let locSearchResult = new URLSearchParams(location.search)
    let locSearchResultCust  = locSearchResult.get('cust')
    let locSearchResultQid   = locSearchResult.get('qid')
    let locSearchResultIcode = locSearchResult.get('icode')
     if (locSearchResultCust != null) {
      this.cust = locSearchResultCust
    }
    if (locSearchResultQid != null) {
      this.qid = locSearchResultQid
    }
    if (locSearchResultIcode != null) {
      this.iCode = locSearchResultIcode
    }
    console.log('this.cust is: ',this.cust)
    console.log('this.qid is: ',this.qid)
    console.log('this.iCode is: ',this.iCode)
    // when no querystring, set defaults to 1
    // not a great idea when we get more.
    if(this.cust == '?'){this.cust = '1'}
    if(this.qid == '?'){this.qid = '1'}
  }

  heAnsweredOneQuestion(hisAnsAcaIxFromHtml) {
    //console.log('running heAnsweredOneQuestion')
    this.calcAnswerTimeGap()
    this.storeAnswer(hisAnsAcaIxFromHtml)  
    if (this.aqx < this.activeQuestions.length - 1) { 
      //console.log('ready to ask another question')
      this.aqx = this.aqx + 1
      this.curQuestTxt = this.activeQuestions[this.aqx].questTxt
      this.curPreQuest = this.activeQuestions[this.aqx].preQuest 
      this.curAca = this.activeQuestions[this.aqx].aca 
    } else {
        this.closeOutActiveAndPrepNextQuestions()
        if (this.activeQuestions.length > 0) {  //we have more questions
          this.aqx = 0
          this.curPreQuest = this.activeQuestions[0].preQuest
          this.curQuestTxt = this.activeQuestions[0].questTxt
          this.curAca = this.activeQuestions[0].aca
        } else {
          this.wrapUp() //we are done with qNa.
        } // end if activeQuest length >0
    } // end if this.aqx
  } // end heAnsweredOneQuestion

  closeOutActiveAndPrepNextQuestions(){
    console.log('done with active sets of questions.')
    for (let i = 0; i < this.subsetArray.length; i++) {
      if (this.subsetArray[i].subsetRound > 0) {
        this.subsetArray[i].ssStatusQnA = 'done'
      }
    }
    this.calcScores()
    this.storeScores()
    this.applyRulesToAccumsAndSubsets() // set accumThreshHit to y or n  
    this.findNextRoundOfActiveQuestions()
    this.curQuestTxt = ''
    this.curPreQuest = ''
    this.curAca = []
  }

  calcAnswerTimeGap(){
    this.answerEndTime = performance.now()
    let tdif = 
      ( this.answerEndTime - 
        this.answerStartTime ) / 1000
    this.timeGap = Math.round(tdif);
    this.answerStartTime = performance.now()
  }  // end calcAnswerTimeGap

  storeAnswer(hisAnsAcaIx){
    //console.log('running storeAnswer')
    // for the recently answered question (the active question),
    // set a point value into hisAnsPoints.
    // he gave an answer, and we captured it into hisAnsAcaIx.
    // for a question, aca and acaPointVals are two data-synced arrays.
    // so we can use hisAnsAcaIx as an index to acaPointVals
    // to determine the point value.
    this.hisAnsPoints = 
      this.activeQuestions[this.aqx].acaPointVals[hisAnsAcaIx]
    this.hisAns =
      this.activeQuestions[this.aqx].aca[hisAnsAcaIx]
      // hisAnsPoints now contains the points to be added 
      // for his answer
    this.buildAnswerFields()
    this.answerArray.push(this.answerObj)
    this.writeAnswerToDb(Event) 
    // billy ya might want to
    // first, look for an existing answer in the db and replace it.
    // if no existing answer, then insert one.
    // look in fauna forums for upsert.  

  } //end storeAnswer

  buildAnswerFields(){
    this.answerObj = 
    {
      "qid": this.activeQuestions[this.aqx].qid,
      "questNbr": this.activeQuestions[this.aqx].questNbr,
      "answerDate": this.todaysDate,
      "qUserId": this.qUserId,
      "answer": this.hisAns,
      "answerPoints": this.hisAnsPoints,
      "timeGap": this.timeGap,
      "accum" : this.activeQuestions[this.aqx].accum,  
      "scoreRound" : 0
    }
        // when building an answer rec, we copy-in the accum array 
        // from the question to help later with scoring.
        // we are NOT adding to answers.accum here,
        // we use answers.scoreRound later, set to 1 2 3 etc,
        // to keep track of whether the answers have been scored yet.
        // we store answers to the database before they are scored,
        // therefore db scoreRound will be zero.
        // only the javascript answer array will have a scoreRound.
        // console.log('my answer object', this.answerObj)
  } // end buildAnswerFields

  writeAnswerToDb(e){
    //console.log('running writeAnswerToDb')
    // writing to the db is helpful for some other later time,
    // but for now, only the answerArray is useful.
    api.qtWriteAnswer(this.answerObj)
        .then 
        (   (qtDbRtnObj) => 
          {
            this.qtDbDataObj = qtDbRtnObj.data
            this.answerCnt = this.answerCnt + 1
            // return from this on-the-fly function is implied  
          }
        ) // done with .then
      .catch((e) => {
        console.log('qtWriteAnswer error. ' +  e)
      })
  } // end writeAnswerToDb

  calcScores(){
    console.log('running calcScores')
    // exit this paragrf with nice values in accumArray.
      // for each answer he gave in this round,
      // add ansPoints to 1 or more accumulators,
      // depending on which accumulators were tied to the question.
      // filter by answerArray.scoreRound = 0 (not yet scored)
      // and loop thru the filtered answer array.
      // then after scoring in this paragrf,
      // keep track of scoring rounds each time you run this,
      // and set answerArray.scoreRound = to this round
      for (let i = 0; i < this.answerArray.length; i++) {
        for (let j = 0; j < this.answerArray[i].accum.length; j++) {
          if (this.answerArray[i].scoreRound == 0) { //not scored yet
            this.findAccumAndAddPoints(this.answerArray[i].accum[j],
                                      this.answerArray[i].answerPoints,
                                      this.answerArray[i].timeGap)
            this.answerArray[i].scoreRound  = this.scoreRound
          }
        }
      } // end answerArray Loop
      this.scoreRound = this.scoreRound + 1 
  } // end calcScores

  findAccumAndAddPoints(accumParmIn,ansPointsParmIn,ansTimeGapParmIn){
    console.log('running findAccumAndAddPoints')
    let pos = this.accumArray
      .map(function(a) { return a.accum }).indexOf(accumParmIn);
    this.accumArray[pos].accumScore =
      this.accumArray[pos].accumScore + ansPointsParmIn
    this.accumArray[pos].accumQuestCnt =  
      this.accumArray[pos].accumQuestCnt + 1
    this.accumArray[pos].accumTimeGap =  
      this.accumArray[pos].accumTimeGap + ansTimeGapParmIn
  } // end findAccumAndAddPoints

  storeScores(){
    console.log('ready to store scores. accumArray:')
    // for each row in accumArray,  buildScore & writeScore
    for (let i = 0; i < this.accumArray.length; i++) {
      if (this.accumArray[i].accumStoreDbYn == 'n'
      && this.accumArray[i].accumQuestCnt > 0) 
        {
        this.buildScoreFields(i)
        this.scoresArray.push(this.scoreObj) 
        this.writeScoresToDb(Event)  
        this.accumArray[i].accumStoreDbYn = 'y'
        this.accumArray[i].accumQuestCnt = 0  //reset to zero
      }
    }
  } // end storeScores

  buildScoreFields(i){
    this.scoreObj = 
    {
      'qid' : this.qid,
      'quserId' : this.qUserId,
      'testDate': this.todaysDate,
      'accum' : this.accumArray[i].accum,
      'score' : this.accumArray[i].accumScore,
      'wscore' : this.accumArray[i].accumScore,
      'questCnt' : this.accumArray[i].accumQuestCnt,
      'timeGap' : this.accumArray[i].accumTimeGap,
    }
  }  // end buildScoreFields

  writeScoresToDb(e){
    console.log('running writeScoresToDb')
    // write to db table qtScores
    api.qtWriteScore(this.scoreObj)
    .then 
    (   (qtDbRtnObj) => 
      {
        this.qtDbDataObj = qtDbRtnObj.data
        this.scoreRecsWritten = this.scoreRecsWritten + 1
        // return from this on-the-fly functon is implied  
      }
    )
  .catch((e) => {
    console.log('qtWriteScore error. ' +  e)
  })
    
  } // end writeScoresToDb

  findNextRoundOfActiveQuestions(){
    console.log('running findNextRoundOfActiveQuestions')
    this.activeQuestions.length = 0   
    this.subsetRound = this.subsetRound + 1
    //find the next bunch of subsets to ask
    this.subsetTempArray = []
    for (let i = 0; i < this.subsetArray.length; i++) {
      if (this.subsetArray[i].filterInYn == 'y' 
      &&  this.subsetArray[i].ssStatusQnA == 'pending') {
        this.subsetArray[i].subsetRound = this.subsetRound
        this.subsetTempArray.push(this.subsetArray[i].subset)
      }
    }  // end for loop subsetArray

   // clever way to pass subsetTempVarArray into .filter  (comma!)
   let subsetTempVarArray = this.subsetTempArray,
   tempActiveQuestions = this.allQuestions.filter(function(q) {
      return  subsetTempVarArray.includes(q.subset)
    });
    this.activeQuestions = tempActiveQuestions
  }

  wrapUp(){
    console.log('running wrapUp')
    this.showQuestHtml = false
    this.showWrapUpHtml = true
    console.log('final answers in answerArray:')
    console.table(this.answerArray)
    console.log('final accums in accumArray:')
    console.table(this.accumArray)
    console.log('final subsets in subsetArray:')
    console.table(this.subsetArray)
  } // end wrapUp

////////////////////////////////////////////

    fetchQtDb4(){ // re-arrange qtDb stuff
      this.launchQtRead03q(Event)
    } 

    launchQtRead03q = (e) => { //do not use
      // example of reading one rec at a time.
      // not really needed for fetching one question at a time.
      // might need a similar paragraph to find single answer rec.
      console.log('running launchQtRead03q')

      // do we really need to keep track of ref?
      // i mean, we will have indexes on tables,
      // and we will search by these indexes.
      // i think the qtDbRef is just for testing.

      // let qtDbRefParm = '276380634185728512'
      // let qtDbRefParm = '276403382834430483'
      let qtDbRefParm = '279739273992733188'

      api.qtRead03(qtDbRefParm)
        .then 
        (   (qtDbRtnObj) => 
          {
            //console.log(' try qtRead03 read = with:' + qtDbRefParm) 
            //console.table(qtDbRtnObj) 
            this.qtDbDataObj = qtDbRtnObj.data
            this.qtDbDataQuestTxt = qtDbRtnObj.data.questTxt
            this.qtDbDataQuestNbr = qtDbRtnObj.data.questNbr
            this.qtDbDataPreQuest = qtDbRtnObj.data.preQuest
            this.qtDbDataSubset = qtDbRtnObj.data.subset
            this.qtDbDataAcaPointVals = qtDbRtnObj.data.acaPointVals
            this.qtDbDataAca = qtDbRtnObj.data.aca
            this.qtDbDataSeq = qtDbRtnObj.data.seq
            this.qtDbDataAccum = qtDbRtnObj.data.accum
            this.qtDbRef = qtDbRtnObj.ref["@ref"].id 
            //console.log('qtDbData: ' + JSON.stringify(this.qtDbDataObj)) 
            //console.log('qtDbDataAca: ' + JSON.stringify(this.qtDbDataAca)) 
            //this.appendOneqtDbQuestionToActiveQuestions()
            //console.log('curAca: ' + JSON.stringify(this.curAca)) 
            // return from this on-the-fly functon is implied  
          }
        )
      .catch((e) => {
        console.log('qtRead03 error. qtDbRefParm: ' + qtDbRefParm + e)
      })
    } 

    /////////////////////////////////////////////////////////////////
    // The first argument of .then 
    // is a function that runs when the promise is resolved, 
    // and receives the result.
    ////////////////////////////////////////////////////////////////

  launchQtRead05 = (e) => {
    api.qtReadQuestions(this.qid)
        .then 
        (   (qtDbRtnObj) => 
          {
            console.log(' running .then of qtReadQuestions') 
            //this.subset = this.subsetArray[this.sax].subset
            //console.log('subset is:',this.subset)
            this.loadQuestionsFromDbToAllQuestions(qtDbRtnObj)
            this.buildListOfAccumsFromAllQuestions()
            //console.log('accums 458')
            //console.table(this.accumArray)
            this.launchQtRead07(event) //rules
            console.table(this.allQuestions)
            this.findNextRoundOfActiveQuestions()
            if (this.activeQuestions.length > 0) {
              this.curQuestTxt = this.activeQuestions[0].questTxt
              this.curPreQuest = this.activeQuestions[0].preQuest
              this.curAca = this.activeQuestions[0].aca
            }
          }
        )
        .catch((e) => {  // api.qtReadQuestions returned an error 
          console.log('api.qtReadQuestions error.' + e)
        })
  }

  loadQuestionsFromDbToAllQuestions(qtDbObj){
    //console.log('running loadQuestionsFromDbToAllQuestions')
    // input qtDbObj from database > output allQuestions array.
    // get here after .then of reading db,
    // so qtDbObj is ready to use.
    this.allQuestions.length = 0 //blank out array, then load it
    for (let i = 0; i < qtDbObj.length; i++) {
      this.allQuestions.push(qtDbObj[i].data)
    }
    //
    // console.log('allQuestions:')
    // console.table(this.allQuestions)
    // console.log('done with loadQuestionsFromDbToAllQuestions')
  }

  buildListOfAccumsFromAllQuestions(){
    console.log('running buildListOfAccumsFromAllQuestions')
    // read all questions array, find the unique accumulators.
    // push a newly discovered accum into accumArray.
    //console.log('allQuestions 495')
    //console.table(this.allQuestions)
    for (let i = 0; i < this.allQuestions.length; i++) {
      // this question has an array of accumulators.
      for (let j = 0; j < this.allQuestions[i].accum.length; j++) {
        // find the accum in accumArray. if not found, add it.
        let position = 
          this.accumArray.map(function(a) { return a.accum })
          .indexOf(this.allQuestions[i].accum[j]);
        if (position < 0){
            this.accumObj = { 
              'accum': this.allQuestions[i].accum[j],
              'accumScore' : 0,
              'accumQuestCnt' : 0,
              'accumTimeGap' : 0,
              'accumStoreDbYn': 'n',
              'accumThreshHit' : 'n'
            }
          this.accumArray.push(this.accumObj)
        }
      }
    }
  } //end buildListOfAccumsFromAllQuestions

  launchQtRead06 = (e) => {
    //console.log('running launchQtRead6')
    api.qtReadSubsets(this.qid)
        .then 
        (   (qtDbRtnObj) => 
          {
            console.log(' running .then of api.qtReadSubsets') 
            this.buildListOfSubsets(qtDbRtnObj)
            //console.table(this.subsetArray)
            //console.log(this.subsetArray[0].subset)

            //this.subset = this.subsetArray[0].subset //first subset
            this.launchQtRead05(Event) // read questions

          }
        )
        .catch((e) => {  // api.qtReadSubsets returned an error 
          console.log('api.qtReadSubsets error.' + e)
        })
  } //end launchQtRead06

  buildListOfSubsets(qtDbObj){
    console.log('running buildListOfSubsets')
    this.subsetsFromDb.length = 0 //start out with an empty array.
    for (let i = 0; i < qtDbObj.length; i++) {
      // we are reading as if there are multiple recs from db,
      // but we expect to fetch just one (for this qid)
      this.subsetsFromDb.push(qtDbObj[i].data)
    }
    for (let j = 0; j < this.subsetsFromDb[0].subsets.length; j++) {
      this.subsetObj = {
        'subset' : this.subsetsFromDb[0].subsets[j],
        'filterInYn' : 'n', // variably overwritten below
        'ssStatusQnA' : 'pending',
        'subsetRound' : 0
      }
      this.subsetArray.push( this.subsetObj )
    }

    this.subsetArray[0].filterInYn = 'y' //billy cheating here main
    this.subsetArray[0].subsetRound = 1 //billy cheating here main
    console.log('we just built subsetArray:')
    console.table(this.subsetArray)
  }  // end buildListOfSubsets

  launchQtRead07 = (e) => {
    console.log('running launchQtRead07')
    api.qtReadRules(this.qid)
      .then 
        (   (qtDbRtnObj) => 
          {
            console.log(' running .then of api.qtReadRules') 
            this.buildListOfRules(qtDbRtnObj)
            //this.applyRulesToAccums() // might not need this on first itme.
            //this.subset = this.subsetArray[0].subset //first rule?
            // maybe turn on only the 'main' subset here?
            // after rules & subsets at startup, 
          }
        )
        .catch((e) => {  // api.qtReadRules returned an error 
          console.log('api.qtReadRules error.' + e)
        })

  } //end launchQtRead07

  buildListOfRules(qtDbObj){
    //console.log('running buildListOfRuless')
    for (let i = 0; i < qtDbObj.length; i++) {
      this.rulesArray.push(qtDbObj[i].data)
    }
    //console.log('we just built rulesArray:')
    //console.table(this.rulesArray)
 
  } // end buildListOfRules

  applyRulesToAccumsAndSubsets(){
    console.log('running applyRulesToAccumsAndSubsets')
    // two arrays here.  accumArray  rulesArray
    // accumArray[].accumScore is already set.
    // run thru accumArray and set accum.threshHit 'y' 
    // for accums that have hit a rule threshHold.
    for (let i = 0; i < this.accumArray.length; i++) {
      // console.log('try lookup on scoresArray:')
      // console.table(this.scoresArray)
      // let sai = this.scoresArray //scores array index
      // .map(function(sa) { return sa.accum }).indexOf(this.accumArray[i].accum)
      // console.log('sai: ',sai)
      // if (sai > -1){
      //   console.log ('hey, ready to check rule and update accum')
      //   console.log('accum:', this.scoresArray[sai].accum)
      //   console.log('score:', this.scoresArray[sai].score)
        // find this accum in rulesArray to get rulesArray.thresh
      let rai = this.rulesArray //rules array index
      .map(function(ra) { return ra.accum }).indexOf(this.accumArray[i].accum)
        if(rai > -1) {
          if(this.accumArray[i].accumScore >= this.rulesArray[rai].thresh) { 
            //console.log('bingo we hit a thresh')
            // billy >= instead of rules.oper means remove oper from db
            //console.log('we want to filterIn subset:',this.rulesArray[rai].subset)
            this.accumArray[i].accumThreshHit = 'y'
            this.subsetToFilterIn = this.rulesArray[rai].subset
            this.applyAccumToSubsets() // set subset filterInYn to y

          } //end if scoresArray
        } // end if rai > -1
      //} // end if sai > -1
    } // end for loop on accumArray

    // after this paragrf,  match accums to subsets during qNa.
    // as we loop thru subsets, check accumArray.threshHit. 
    // where are we looping thru subsets? 
    // seems like we rely on this.subset during qNa.
    // so whatever is setting this.subset should skip past
    // those where the matching accumArray.threshHit <> 'y'.
    // I mean, revisit where we set this.subset in lines 122 450
       
  // rules say when a scoreboard accum should trigger a subset.
  // rules control which subsets are in play.
  //  we should ask questions for a limited set of subsets.
  // after scoring, accum.accumScore tells us how many points
  // were achieved.  that's already working.
  //  a RULE is a definition of whether a subset should be asked.
  // if accumScore > thresh, then filter-in a subset.
  // each subset should have a rule.  see db qtRules for layout.
  // example rules:
  // qid 1 subset ss1 - if accum main > thresh then subset ss1 is IN
  // qid 1 subset ss2 - if accum main > thresh then subset ss2 is IN
  // qid 1 subset ssParakeet2 - 
  //    if accum pk1 > thresh then this subset ssParakeet2 is IN
  // qid 1 subset ssParakeet3 - 
  //    if accum pk2 > thresh then this subset ssParakeet3 is IN
    //console.log('done with applyRulesToAccumsAndSubsets. accumArray:')
    //console.table(this.accumArray)
  } // end applyRulesToAccumsAndSubsets

  applyAccumToSubsets(){
    // come into this para with subsetToFilterIn
    // and use it to set one subsetArray.filterInYn
     console.log('running applyAccumToSubsets')
     console.log(this.subsetToFilterIn)
    // console.log('find subset and set filterIn to y',this.subsetToFilterIn)
    let ssi =
      this.subsetArray.findIndex(obj => obj.subset === this.subsetToFilterIn);
    this.subsetArray[ssi].filterInYn = 'y'
    //console.table(this.subsetArray)
    //   console.log('ssi',ssi)
    // console.log(this.subsetArray[ssi])



  } // end applyAccumToSubsets

  setDiagnosticsOnOff(){
    //console.log('running setDiagnosticsOnOff')
    if (this.showDiagHtml === true) {
      this.showDiagHtml = false
    }else{
      this.showDiagHtml = true
    }
  } // end setDiagnosticsOnOff

} //end class QuestComponent