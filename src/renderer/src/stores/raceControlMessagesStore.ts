import { create } from 'zustand'
import { RaceControlMessage } from '../types/liveTimingTypes'

interface RaceControlMessagesState {
  Messages: Map<string, RaceControlMessage>
  addRaceControlMessage: (messages: { [key: string]: RaceControlMessage }) => void
}

export const useRaceControlMessagesStore = create<RaceControlMessagesState>((set) => ({
  Messages: new Map<string, RaceControlMessage>(),

  addRaceControlMessage: (newMessages: { [key: string]: RaceControlMessage }) =>
    set((state) => {
      const updatedMessages = new Map(state.Messages)
      Object.keys(newMessages).forEach((key) => {
        // if the key is "messages" go into it and log the message
        if (key === 'Messages') {
          //  console.log('Messages:', newMessages[key])
          // get all the keys in the newMessages object
          Object.keys(newMessages[key]).forEach((messageKey) => {
            // console.log(`Message Key: ${messageKey}, Message:`, newMessages[key][messageKey])
            updatedMessages.set(messageKey, newMessages[key][messageKey])
          })
          return
        }
      })
      return { Messages: updatedMessages }
    })
}))
