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
  qtDbDataObj: object = {}
  qtDbDataQuestNbr = '?'
  qtDbDataQuestTxt = '?'
  qtDbDataPreQuest = '?'
  qtDbDataSubset = '???'
  qtDbRef = '?'
  qtDbDataAca = [] 
  qtDbDataSeq = '?' 
  qtDbDataAcaPointVals = [] 
  allQuestions = []
  activeQuestions = []
  countMySetsTempTest = 1
  timeGap = 222
  showQuestHtml = true
  showAnswerGroupHtml = true 
  showWrapUpHtml = false
  showDiagHtml = false
  todaysDate = new Date().toJSON().split("T")[0];
  myAnswerObj: object = {}
  subsetArray = []
  allSubsets = []
  sax = 0 // subset array index
  subset = 'aaa'
  accumListUnique = []

  todoInfo =
 {
    title: 'crapACheeNo',
    completed: false,
  }
  constructor() { }

  ngOnInit(): void {
    this.setQueryStringParms()
    this.initSubsetArray()
    this.launchQtRead05(Event) //fetch all questions from db
    this.launchQtRead06(Event) //fetch all subsets from db
  }
  
  setQueryStringParms(){
    let locSearchResult = new URLSearchParams(location.search)
    let locSearchResultCust  = locSearchResult.get('cust')
    let locSearchResultQid   = locSearchResult.get('qid')
    let locSearchResultIcode = locSearchResult.get('icode')
     // cust:
     if (locSearchResultCust != null) {
      this.cust = locSearchResultCust
    }
    // qid:
    if (locSearchResultQid != null) {
      this.qid = locSearchResultQid
    }
    // iCode:
    if (locSearchResultIcode != null) {
      this.iCode = locSearchResultIcode
    }
    console.log('this.cust is: ',this.cust)
    console.log('this.qid is: ',this.qid)
    console.log('this.iCode is: ',this.iCode)
  }


  initSubsetArray(){ 
    //read qtSubsets db table.  load to subsetArray.
    // ed used to have a primary subset and a follow on subset,
    // but we are more complex now.

    // lets say we have fifty different subsets and
    // each question it tied to one of those fifty subsets
    // via allquestions[x].subset
    // 
    // so how should we represent fifty subsets in qtSubsets?
    // we will need fifty reads if we separate them,
    // but maybe only 1 read if we have all subsets in one db array.
    // that makes it easy for this program,
    // but harder for test setup.  during test setup,
    // when he adds a subset to a qid,
    // test setup would have to append to the qid's single db array.  
    this.subsetArray.push(   { "subset": 'aaa'   } )
    this.subsetArray.push(   { "subset": 'bbb'   } )
    this.subsetArray.push(   { "subset": 'ccc'   } )
    console.table(this.subsetArray)
  } // end initSubsetArray


  loadFirstQuestionOfSetToCur(){
    // console.log('running loadFirstQuestionOfSetToCur')
    // console.table(this.activeQuestions)
    // if (this.aqx <= this.activeQuestions.length) { 
    //   this.curQuestTxt = this.activeQuestions[this.aqx].questTxt  
    //   this.curPreQuest =  this.activeQuestions[this.aqx].preQuest 
    //   this.curAca = this.activeQuestions[this.aqx].aca
    // }
  } // end loadFirstQuestionOfSetToCur

  heAnsweredOneQuestion(hisAnsAcaIxFromHtml) {
    console.log('running heAnsweredOneQuestion')
    this.storeAnswer(hisAnsAcaIxFromHtml)  
    if (this.aqx < this.activeQuestions.length - 1) { 
      console.log('ready to ask another question')
      this.aqx = this.aqx + 1
      this.curQuestTxt = this.activeQuestions[this.aqx].questTxt
      this.curPreQuest = this.activeQuestions[this.aqx].preQuest 
      this.curAca = this.activeQuestions[this.aqx].aca 
    } else {
      console.log('active set is done')
      this.curQuestTxt = ''
      this.curPreQuest = ''
      this.curAca = []
       
      this.sax = this.sax + 1 
      if (this.sax < this.subsetArray.length) { 
        this.subset = this.subsetArray[this.sax].subset
        this.loadOneRoundToActiveQuestions(this.subset)
      } else {
        this.activeQuestions.length = 0
      }
      
      // if (this.subset == 'ccc'){this.subset = '---'}
      // if (this.subset == 'bbb'){this.subset = 'ccc'}
      // if (this.subset == 'aaa'){this.subset = 'bbb'}
      if (this.activeQuestions.length>0){  //we have more questions
        this.aqx = 0
        this.curPreQuest = this.activeQuestions[0].preQuest
        this.curQuestTxt = this.activeQuestions[0].questTxt
        this.curAca = this.activeQuestions[0].aca
      } else {
        this.wrapUp() //we are done with qNa.
      }
      //this.performScoring()
    }
  } // end heAnsweredOneQuestion

  storeAnswer(hisAnsAcaIx){
    console.log('running storeAnswer')
    console.log('ready to store answer for:',this.curQuestTxt)
    console.log('hisAnsAcaIx',hisAnsAcaIx)
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
    console.log('aqx:',this.aqx)
    console.log('he answered with aca:',this.curAca[hisAnsAcaIx])
    console.log('hisAnsPoints:',this.hisAnsPoints)
    console.log('hisAns:',this.hisAns)
      // hisAnsPoints now contains the points to be added 
      // for his answer
    this.buildAnswerFields()
    // billy, now do the function to insert a rec into qtAnswers
    // first, look for an existing answer and replace it.
    // if no existing answer, then insert one.

    // this.writeAnswerToDb(Event) billy turn this back on
    // might also want to add to accums?  now or later?
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
      "timeGap": this.timeGap
    }
    console.log('my answer object', this.myAnswerObj)
  }
  writeAnswerToDb(ev){
    console.log('running writeAnswerToDb')
    api.qtWriteAnswer(this.myAnswerObj)
        .then 
        (   (qtDbRtnObj) => 
          {
            console.log(' try writeAnswerToDb with:' + this.myAnswerObj) 
            console.table(qtDbRtnObj) 
            this.qtDbDataObj = qtDbRtnObj.data
            // this.qtDbDataQuestTxt = qtDbRtnObj.data.questTxt
            // this.qtDbRef = qtDbRtnObj.ref["@ref"].id 
            console.log('qtDbData: ' + JSON.stringify(this.qtDbDataObj)) 
            // return from this on-the-fly functon is implied  
          }
        )
      .catch((e) => {
        console.log('qtWriteAnswer error. ' +  ev)
      })
  }

  performScoring(){
    console.log('running performScoring')

  } // end performScoring

  determineNextSubsets(){
  //   console.log('running determineNextSubsets')
  } //end determineNextSet
 
  loadOneRoundToActiveQuestions(subsetParmIn){
    //console.log('filtering questions for subset:', subsetParmIn)
    this.activeQuestions = this.allQuestions.filter(function(qRow){
      return qRow.subset == subsetParmIn //'aaa'  fix this   
    })
    //console.table(this.activeQuestions)
  } //end loadOneRoundOfQuestionsToActiveQuestions
   
  loadNextSet(){
    console.log('running loadNextSet')
    //this.loadTest2ndSetofQuestions()
    this.aqx = 0
  } //end loadNextSet

  wrapUp(){
    console.log('running wrapUp')
    this.showQuestHtml = false
    // this.showAnswerGroup1Html = false
    // this.showAnswerGroup2Html = false
    // this.showAnswerGroup3Html = false
    this.showWrapUpHtml = true
  } // end wrapUp

////////////////////////////////////////////

    // fetchQtDbTest3(){ //test db qt read by db ref
    //   this.launchQtRead03q(Event)
    // } //end fetchQtDbTest3


    fetchQtDb4(){ // re-arrange qtDb stuff
      this.launchQtRead03q(Event)
    } 

    fetchQtDbTest5(){   //html button can be killed someday
      this.launchQtRead05(Event)
      // alert('i am done with launchQtRead05')

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
            console.log(' try qtRead03 read = with:' + qtDbRefParm) 
            console.table(qtDbRtnObj) 
            this.qtDbDataObj = qtDbRtnObj.data
            this.qtDbDataQuestTxt = qtDbRtnObj.data.questTxt
            this.qtDbDataQuestNbr = qtDbRtnObj.data.questNbr
            this.qtDbDataPreQuest = qtDbRtnObj.data.preQuest
            this.qtDbDataSubset = qtDbRtnObj.data.subset
            this.qtDbDataAcaPointVals = qtDbRtnObj.data.acaPointVals
            this.qtDbDataAca = qtDbRtnObj.data.aca
            this.qtDbDataSeq = qtDbRtnObj.data.seq
            this.qtDbRef = qtDbRtnObj.ref["@ref"].id 
            console.log('qtDbData: ' + JSON.stringify(this.qtDbDataObj)) 
            console.log('qtDbDataAca: ' + JSON.stringify(this.qtDbDataAca)) 
            //this.appendOneqtDbQuestionToActiveQuestions()
            console.log('curAca: ' + JSON.stringify(this.curAca)) 
            // return from this on-the-fly functon is implied  
          }
        )
      .catch((e) => {
        console.log('qtRead03 error. qtDbRefParm: ' + qtDbRefParm + e)
      })
      // alert('done running launchQtRead03q')
    } 


    /////////////////////////////////////////////////////////////////
    // The first argument of .then 
    // is a function that runs when the promise is resolved, 
    // and receives the result.
    ////////////////////////////////////////////////////////////////

  launchQtRead05 = (e) => {
    api.qtReadQuestions('iWonderWhatGoesHereMaybePaginationParms')
        .then 
        (   (qtDbRtnObj) => 
          {
            console.log(' running .then of qtReadQuestions') 
            this.loadQuestionsFromDbToAllQuestions(qtDbRtnObj)
            this.loadOneRoundToActiveQuestions(this.subset)
            this.curPreQuest = this.activeQuestions[0].preQuest
            this.curQuestTxt = this.activeQuestions[0].questTxt
            this.curAca = this.activeQuestions[0].aca
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
    //console.log('qtDbObj.data is::::::')
    //console.table(qtDbObj[0].data)
    this.allQuestions.length = 0 //start out with an empty array.
    for (let i = 0; i < qtDbObj.length; i++) {
      this.allQuestions.push(qtDbObj[i].data)
    }
    //console.log('done with loadQuestionsFromDbToAllQuestions')
  }

  buildListOfAccumsFromAllQuestions(){
    console.log('running buildListOfAccumsFromAllQuestions')
    // read all questions array, find the unique accumulators.
    // push a newly discovered accum into accumListUnique.
    for (let i = 0; i < this.allQuestions.length; i++) {
      // this question has an array of accumulators.
      for (let j = 0; j < this.allQuestions[i].accum.length; j++) {
        // find this accum in accumListUnique. if not found, add it.
        let fff = this.accumListUnique.indexOf(
                      this.allQuestions[i].accum[j]
                    )
        if (fff < 0){
            this.accumListUnique.push(this.allQuestions[i].accum[j] )
        }
      }
    }
  }

  launchQtRead06 = (e) => {
    console.log('running launchQtRead6')
    const todoInfo = {
      title: 'crapAdellic',
      completed: false,
    }
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
    this.allSubsets.length = 0 //start out with an empty array.
    for (let i = 0; i < qtDbObj.length; i++) {
      this.allSubsets.push(qtDbObj[i].data)
    }
    console.table(this.allSubsets)
  }

  setDiagnosticsOnOff(){
    //console.log('running setDiagnosticsOnOff')
    if (this.showDiagHtml === true) {
      this.showDiagHtml = false
    }else{
      this.showDiagHtml = true
    }
  }
} //end of component
