import {
  Plan, PlanAction, ObjectType, InstanceElement,
} from 'adapter-api'
import {
  getPlan, applyActions, discoverAll, mergeAndValidate,
} from './core'
import { init as initAdapters } from './adapters'
import Parser from '../parser/salto'
import { Blueprint, getAllElements } from '../blueprints/blueprint'
import State from '../state/state'


export const plan = async (
  blueprints: Blueprint[],
): Promise<Plan> => {
  const elements = mergeAndValidate(await getAllElements(blueprints))
  const state = new State()
  const actionPlan = await getPlan(state, elements)
  return actionPlan
}

export const apply = async (
  blueprints: Blueprint[],
  fillConfig: (configType: ObjectType) => Promise<InstanceElement>,
  shouldApply: (plan: Plan) => Promise<boolean>,
  reportProgress: (action: PlanAction) => void,
  force: boolean = false
): Promise<Plan> => {
  const elements = mergeAndValidate(await getAllElements(blueprints))
  const state = new State()
  try {
    const actionPlan = await getPlan(state, elements)
    if (force || await shouldApply(actionPlan)) {
      const [adapters] = await initAdapters(elements, fillConfig)
      await applyActions(state, actionPlan, adapters, reportProgress)
    }
    return actionPlan
  } finally {
    await state.flush()
  }
}

export const discover = async (
  blueprints: Blueprint[],
  fillConfig: (configType: ObjectType) => Promise<InstanceElement>,
): Promise<Blueprint> => {
  const elements = mergeAndValidate(await getAllElements(blueprints))
  const [adapters, newAdapterConfigs] = await initAdapters(elements, fillConfig)
  const state = new State()
  try {
    const discoverElements = await discoverAll(state, adapters)
    const uniqElements = [...discoverElements, ...Object.values(newAdapterConfigs)]
    const buffer = await Parser.dump(uniqElements)
    return { buffer, filename: 'none' }
  } finally {
    await state.flush()
  }
}