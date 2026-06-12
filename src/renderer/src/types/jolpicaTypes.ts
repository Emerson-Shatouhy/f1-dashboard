export interface JolpicaSessionTime {
  date: string
  time: string
}

export interface JolpicaLocation {
  locality: string
  country: string
}

export interface JolpicaCircuit {
  circuitId: string
  circuitName: string
  Location: JolpicaLocation
}

export interface JolpicaRace {
  season: string
  round: string
  raceName: string
  date: string
  time?: string
  Circuit: JolpicaCircuit
  FirstPractice?: JolpicaSessionTime
  SecondPractice?: JolpicaSessionTime
  ThirdPractice?: JolpicaSessionTime
  Qualifying?: JolpicaSessionTime
  Sprint?: JolpicaSessionTime
  SprintQualifying?: JolpicaSessionTime
}
