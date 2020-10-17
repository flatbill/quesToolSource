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
  // hisAnsIndexIn = 0
  hisAns = '0'
  countAnswerQty = 0
  doneWithActiveSet = 'no'
  doneWithAllSets ='no'
  aqx = 0 // active question index
  curQuest = 'no questions yet'
  curPreQuest = 'no style yet'
  curAca = []   //aca is Answer Choice Array.  One aca per question.
  faunaDataObj: object = {}
  faunaDataQuest = '?'
  faunaRef = '?'
  faunaDataAca = [] 
  activeQuestions = []
  countMySetsTempTest = 1
  showQuestHtml = true
  showAnswerGroup1Html = true // probably kill this
  showAnswerGroup2Html = false // probably kill this
  showAnswerGroup3Html = false // probably kill this
  showWrapUpHtml = false
  showDiagHtml = false
  constructor() { }

  ngOnInit(): void {
    this.initFirstSetOfQuestions()
    this.askOneQuestion() 
  }
  

  askOneQuestion(){
    console.log('running askOneQuestion')
    if (this.aqx <= this.activeQuestions.length) { 
      this.curQuest = this.activeQuestions[this.aqx].quest  
      this.curPreQuest =  this.activeQuestions[this.aqx].preQuest 
      this.curAca = this.activeQuestions[this.aqx].aca
    }
  } // end askOneQuestion

  heAnsweredOneQuestion(hisAnsIndexIn) {
    console.log('running heAnsweredOneQuestion')
    this.hisAns = this.curAca[hisAnsIndexIn]
    console.log('hisAnsIndexIn',hisAnsIndexIn)
    console.log('he answered: ' + this.hisAns)    
    this.storeAnswer()
    if (this.aqx < this.activeQuestions.length - 1) { 
      console.log('ready to ask another question')
      this.aqx = this.aqx + 1
      this.curQuest = this.activeQuestions[this.aqx].quest 
      this.curPreQuest = this.activeQuestions[this.aqx].preQuest 
      this.curAca = this.activeQuestions[this.aqx].aca 
    } else {
      console.log('active set is done')
      this.curQuest = ''
      this.curPreQuest = ''
      this.curAca = []
      this.performScoring()
      this.determineNextSet()
      // if (this.doneWithAllSets  === 'no') {
      // //69 this.loadNextSet()
      // //alert('asking again...')
      // //this.askOneQuestion()
      // } else {
      //   //this.wrapUp()
      // }
    }
  } // end heAnsweredOneQuestion

  storeAnswer(){
    console.log('running storeAnswer')
    this.countAnswerQty = this.countAnswerQty + 1
    if (this.countAnswerQty >= 1 ) {  
      console.log('time to store an answer')
    }
  } //end storeAnswer

  performScoring(){
    console.log('running performScoring')

  } // end performScoring

  determineNextSet(){
    console.log('running determineNextSet')
    // eventually, read something to see if there are more sets
    this.countMySetsTempTest = this.countMySetsTempTest + 1
    if (this.countMySetsTempTest > 2) {
      // when we find ourselves out of question sets:
      console.log('done with all sets')
      this.wrapUp()
    } else {
      this.loadNextSet()
      this.askOneQuestion()
  }
  } //end determineNextSet

  loadNextSet(){
    console.log('running loadNextSet')
    this.loadTest2ndSetofQuestions()
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

    fetchFauna3(){ // re-arrange fauna stuff
      this.launchQtRead03q(Event)
    } //end fetchFauna3


    fetchFauna4(){ // re-arrange fauna stuff
      this.launchQtRead03q(Event)
    } 


    launchQtRead03q = (e) => {
      // example of reading one rec at a time.
      // not really needed for fetching one question at a time.
      // instead, we should fetch a bunch of questions.
      // might need a similar paragraph to find single answer rec.
      // alert('running launchQtRead03q')
      let faunaRefParm = '276380634185728512'
      faunaRefParm = '276403382834430483'
      faunaRefParm = '279120268390040073'
      

      api.qtRead03(faunaRefParm)
        .then 
        (   (faunaRtnObj) => 
          {
            console.log(' try qtRead03 read = with:' + faunaRefParm) 
            console.table(faunaRtnObj) 
            this.faunaDataObj = faunaRtnObj.data
            this.faunaDataQuest = faunaRtnObj.data.quest
            this.faunaDataAca = faunaRtnObj.data.aca
            this.faunaRef = faunaRtnObj.ref["@ref"].id 
            console.log('faunaData: ' + JSON.stringify(this.faunaDataObj)) 
            console.log('faunaDataAca: ' + JSON.stringify(this.faunaDataAca)) 
            this.curAca = this.faunaDataAca
            console.log('curAca: ' + JSON.stringify(this.curAca)) 

            // return from this on the fly functon is implied  
          }
        )
      .catch((e) => {
        console.log('qtRead03 error. faunaRefParm: ' + faunaRefParm + e)
      })
      // alert('done running launchQtRead03q')
    } 


    /////////////////////////////////////////////////////////////////
    // The first argument of .then 
    // is a function that runs when the promise is resolved, 
    // and receives the result.
  ////////////////////////////////////////////////////////////////
  /* launchQtRead01xxx = (e) => {
    alert('running launchQtRead01')
    const wango = e.target.dataset.id
    // Make API request 
    api.qtRead01(wango).then(() => {
      console.log(`qtRead01 ${wango}`)     
    }).catch((e) => {
      console.log(`qtRead01 error reading ${wango}`, e)
    })
  }  */
  /////////////////////////////////////////////////////////////////
  initFirstSetOfQuestions(){
    this.activeQuestions = [
      {
        "qid": "1",
        "questId": "0",
        "quest": "Welcome to the most advanced soul evaluation that mankind has ever known.  This questionnaire will test your sanity, your vocabulary, and your patience.",
        "aca": ['... continue ...'],
        "preQuest": "this is like an intro.",
        "seq": "2500",
        "qRef": '276403382834430483'
      },
      {
        "qid": "1",
        "questId": "1",
        "quest": "Do you want a sandwich?",
        "aca": ['yes','no'],
        "preQuest": "First, let's see how hungry you are.",
        "seq": "2500",
        "qRef": '276403382834430483'
      },
      {
        "qid": "1",
        "questId": "2",
        "quest": "DEPLORE is most OPPOSITE to ... ",
        "aca": ['indulge','approve','separate','entertain','weaken'] ,
        "preQuest": " your vocabulary skills",
        "seq": "2600",
        "qRef": '276403382834430483'
      }
  
    ] //end of initial set of activeQuestions
  }

  loadTest2ndSetofQuestions(){
    console.log('running loadTest2ndSetofQuestons')
    this.activeQuestions = [
      {
        "qid": "1",
        "questId": "3",
        "quest": "Have you ever been to Heaven?",
        "aca": ['no','yes','maybe, like in a dream'],
        "preQuest": "Here's the first question of set2. Let's keep learning about you.",
        "seq": "2500",
        "qRef": '276403382834430483'
      },
      {
        "qid": "1",
        "questId": "4",
        "quest": "On a scale of 1 to 8, how much do you like ice cream?",
        "aca": [1,2,3,4,5,6,7,8],
        "preQuest": "here's the last question of set2",
        "seq": "2600",
        "qRef": '276403382834430483'
      },
      {
        "qid": "1",
        "questId": "5",
        "quest": "On a scale of 9 to 6, how cool are you?",
        "aca": [9,8,7,6],
        "preQuest": "here's the last question of set2",
        "seq": "2600",
        "qRef": '276403382834430483'
      }
  
    ] //end of initial set of activeQuestions

  }

  setDiagnosticsOnOff(){
    console.log('running setDiagnosticsOnOff')
    if (this.showDiagHtml === true) {
      this.showDiagHtml = false
    }else{
      this.showDiagHtml = true
    }
  }
} //end of component
