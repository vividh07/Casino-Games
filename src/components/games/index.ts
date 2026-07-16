import type { ComponentType } from 'react'
import type { GameId } from '@/types'
import { Blackjack } from './Blackjack'
import { Poker } from './Poker'
import { WheelSpin } from './WheelSpin'
import { Slots } from './Slots'
import { Crash } from './Crash'
import { Plinko } from './Plinko'
import { DragonTiger } from './DragonTiger'

export const GAME_COMPONENTS: Record<GameId, ComponentType> = {
  blackjack: Blackjack,
  poker: Poker,
  wheel: WheelSpin,
  slots: Slots,
  crash: Crash,
  plinko: Plinko,
  dragon_tiger: DragonTiger,
}
