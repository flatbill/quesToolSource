import { Component, OnInit } from '@angular/core';
//import QuestJson from './questData.json';
//import api from '.\utils\api.js'
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
  qUserId = 'BillSelzer'
  iCode = '?'
  hisAns = '0'
  hisAnsAcaIndex = 0
  hisAnsPoints = 0
  doneWithActiveSet = 'no'
  doneWithAllSets ='no'
  aqx = 0 // active question index
  curQuestTxt = 'no QuestTxt yet'
  curPreQuest = 'no PreQuest yet'
  curAca = []   //aca is Answer Choice Array.  One aca per question.
  curFirstAccum = '?'
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
  countMySetsTempTest = 1
  showQuestHtml = true
  showAnswerGroupHtml = true 
  showWrapUpHtml = false
  showDiagHtml = false
  todaysDate = new Date().toJSON().split("T")[0];
  myAnswerObj: object = {}
  accumObj: object = {}
  subsetArray = []  
  subsetsFromDb = []   
  sax = 0 // subset array index
  subset = 'aaa'
  accumListUnique = []
  timeGap = 0
  answerStartTime = performance.now()
  answerEndTime = performance.now()
  answerArray = []
  scoreRound = 1
  //billy, maybe create question rec layout, like dateCodeCatalog.
  // right now, questions just follow the db rec layout.
  // is that good enuff, or will it be confusing later?
  constructor() { }

  ngOnInit(): void {
    this.setQueryStringParms()
    this.launchQtRead05(Event) //fetch all questions from db
    this.launchQtRead06(Event) //fetch all subsets from db
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
    if(this.cust = '?'){this.cust = '1'}
    if(this.qid = '?'){this.qid = '1'}
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
      this.curFirstAccum = this.activeQuestions[this.aqx].accum[0] 
    } else {
      console.log('done with active subset.')
      this.performScoring()
      this.curQuestTxt = ''
      this.curPreQuest = ''
      this.curAca = []
      this.curFirstAccum = ' '
      // sax means which subset we are on.
      this.sax = this.sax + 1 
      if (this.sax < this.subsetArray.length) { 
        this.subset = this.subsetArray[this.sax].subset
        //console.log('moving on to this.subset:',this.subset )
        this.loadOneRoundToActiveQuestions(this.subset)
      } else {
        this.activeQuestions.length = 0
      }
      
      if (this.activeQuestions.length > 0) {  //we have more questions
        this.aqx = 0
        this.curPreQuest = this.activeQuestions[0].preQuest
        this.curQuestTxt = this.activeQuestions[0].questTxt
        this.curAca = this.activeQuestions[0].aca
        this.curFirstAccum = this.activeQuestions[0].accum[0]
      } else {
        this.wrapUp() //we are done with qNa.
      }
    }
  } // end heAnsweredOneQuestion

  calcAnswerTimeGap(){
    this.answerEndTime = performance.now()
    let tdif = 
      ( this.answerEndTime - 
        this.answerStartTime ) / 1000
    this.timeGap = Math.round(tdif);
    this.answerStartTime = performance.now()
  }  // end calcAnswerTimeGap

  storeAnswer(hisAnsAcaIx){
    console.log('running storeAnswer')
    //console.log('ready to store answer for:',this.curQuestTxt)
    //console.log('hisAnsAcaIx',hisAnsAcaIx)
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
    console.log('hisAnsPoints:',this.hisAnsPoints)
    console.log('hisAns:',this.hisAns)
      // hisAnsPoints now contains the points to be added 
      // for his answer
    this.buildAnswerFields()
    this.pushAnswerToAnswerArray()
    // billy turn this back on:
    // this.writeAnswerToDb(Event) 
    // first, look for an existing answer in the db and replace it.
    // if no existing answer, then insert one.

  } //end storeAnswer

  buildAnswerFields(){
    this.myAnswerObj = 
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
        // we use scoreRound later, set to 1 2 3 etc,
        // to keep track of whether the answers have been scored yet.
        // console.log('my answer object', this.myAnswerObj)
  } // end buildAnswerFields

  pushAnswerToAnswerArray(){
    // every time he gives an answer, push to answerArray.
    this.answerArray.push(this.myAnswerObj)
  }

  writeAnswerToDb(ev){
    console.log('running writeAnswerToDb')
    api.qtWriteAnswer(this.myAnswerObj)
        .then 
        (   (qtDbRtnObj) => 
          {
            //console.log(' try writeAnswerToDb with:' + this.myAnswerObj) 
            //console.table(qtDbRtnObj) 
            this.qtDbDataObj = qtDbRtnObj.data
            // this.qtDbDataQuestTxt = qtDbRtnObj.data.questTxt
            // this.qtDbRef = qtDbRtnObj.ref["@ref"].id 
            //console.log('qtDbData: ' + JSON.stringify(this.qtDbDataObj)) 
            // return from this on-the-fly functon is implied  
          }
        )
      .catch((e) => {
        console.log('qtWriteAnswer error. ' +  e)
      })
  }

  performScoring(){
    console.log('running performScoring')
      // for each answer he gave in this round,
      // add ansPoints to 1 or more accumulators,
      // depending on which accumulators were tied to the question.
      // filter by answerArray.scoreRound = 0 (not yet scored)
      // and loop thru the filtered answer array.
      // then after scoring in this paragrf,
      // keep track of scoring rounds each time you run this,
      // and set answerArray.scoreRound = to this round
      // billy ya gotta store the scores for the accums.
      // do this periodically, maybe after each scoring round?
      for (let i = 0; i < this.answerArray.length; i++) {
        for (let j = 0; j < this.answerArray[i].accum.length; j++) {
          if (this.answerArray[i].scoreRound == 0) {
            this.findAccumAndAddPoints(this.answerArray[i].accum[j],
                                      this.answerArray[i].answerPoints)
            this.answerArray[i].scoreRound  = this.scoreRound
                                    }
        }
      } // end answerArray Loop
      this.scoreRound = this.scoreRound + 1 
  } // end performScoring

  findAccumAndAddPoints(accumParmIn,ansPointsParmIn){
    //console.log('running findAccumAndAddPoints')
    let pos = this.accumListUnique
      .map(function(a) { return a.accum }).indexOf(accumParmIn);
    this.accumListUnique[pos].accumScore =
      this.accumListUnique[pos].accumScore + ansPointsParmIn
    this.accumListUnique[pos].accumQuestCnt =  
      this.accumListUnique[pos].accumQuestCnt + 1
  } // end findAccumAndAddPoints
 
  loadOneRoundToActiveQuestions(subsetParmIn){
    this.activeQuestions = this.allQuestions.filter(function(qRow){
      return qRow.subset == subsetParmIn     
    })
  } //end loadOneRoundOfQuestionsToActiveQuestions

  wrapUp(){
    console.log('running wrapUp')
    this.showQuestHtml = false
    this.showWrapUpHtml = true
    console.log('final answers:')
    console.table(this.answerArray)
    console.log('final accums:')
    console.table(this.accumListUnique)
  } // end wrapUp

////////////////////////////////////////////

    fetchQtDb4(){ // re-arrange qtDb stuff
      this.launchQtRead03q(Event)
    } 

    fetchQtDbTest5(){   //html button can be killed someday
      this.launchQtRead05(Event)
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
            this.loadQuestionsFromDbToAllQuestions(qtDbRtnObj)
            this.loadOneRoundToActiveQuestions(this.subset)
            this.curPreQuest = this.activeQuestions[0].preQuest
            this.curQuestTxt = this.activeQuestions[0].questTxt
            this.curAca = this.activeQuestions[0].aca
            this.curFirstAccum = this.activeQuestions[0].accum[0]
            this.buildListOfAccumsFromAllQuestions()
          }
        )
        .catch((e) => {  // api.qtReadQuestions returned an error 
          console.log('api.qtReadQuestions error.' + e)
        })
  }


  loadQuestionsFromDbToAllQuestions(qtDbObj){
    console.log('running loadQuestionsFromDbToAllQuestions')
    // input qtDbObj from database > output allQuestions array.
    // get here after .then of reading db,
    // so qtDbObj is ready to use.
    this.allQuestions.length = 0 //blank out array, then load it
    for (let i = 0; i < qtDbObj.length; i++) {
      this.allQuestions.push(qtDbObj[i].data)
    }
    //
    console.log('allQuestions:')
    console.table(this.allQuestions)
    console.log('done with loadQuestionsFromDbToAllQuestions')
  }

  buildListOfAccumsFromAllQuestions(){
    console.log('running buildListOfAccumsFromAllQuestions')
    // read all questions array, find the unique accumulators.
    // push a newly discovered accum into accumListUnique.
    for (let i = 0; i < this.allQuestions.length; i++) {
      // this question has an array of accumulators.
      for (let j = 0; j < this.allQuestions[i].accum.length; j++) {
        // find the accum in accumListUnique. if not found, add it.
        let position = 
          this.accumListUnique.map(function(a) { return a.accum })
          .indexOf(this.allQuestions[i].accum[j]);
        if (position < 0){
            this.accumObj = { 
              'accum': this.allQuestions[i].accum[j],
              'accumScore' : 0,
              'accumQuestCnt' : 0
            }
          this.accumListUnique.push(this.accumObj)
        }
      }
    }
    console.log('accumListUnique:')
    console.table(this.accumListUnique)
  }

  launchQtRead06 = (e) => {
    console.log('running launchQtRead6')
    api.qtReadSubsets(this.qid)
        .then 
        (   (qtDbRtnObj) => 
          {
            console.log(' running .then of api.qtReadSubsets') 
            this.buildListOfSubsets(qtDbRtnObj)
          }
        )
        .catch((e) => {  // api.qtReadSubsets returned an error 
          console.log('api.qtReadSubsets error.' + e)
        })
  }

  buildListOfSubsets(qtDbObj){
    console.log('running buildListOfSubsets')
    this.subsetsFromDb.length = 0 //start out with an empty array.
    for (let i = 0; i < qtDbObj.length; i++) {
      // we are reading as if there are multiple recs from db,
      // but we expect to fetch just one (for this qid)
      this.subsetsFromDb.push(qtDbObj[i].data)
    }
    let ssObj = {}
    for (let j = 0; j < this.subsetsFromDb[0].subsets.length; j++) {
      ssObj = {'subset' : this.subsetsFromDb[0].subsets[j]}
      this.subsetArray.push( ssObj )
    }
  }  // end of buildListOfSubsets
  /////////////////////////////////////////////////////////////////
    // a neato keen way to filter only for pigFly = 'yes':
    // this.array2 = 
    //   this.array1.filter(x => x.pigFly == 'yes')

  setDiagnosticsOnOff(){
    //console.log('running setDiagnosticsOnOff')
    if (this.showDiagHtml === true) {
      this.showDiagHtml = false
    }else{
      this.showDiagHtml = true
    }
  }
} //end of component
