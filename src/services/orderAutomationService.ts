
import { findAutomationRule } from './automationRulesService'

export const applyAutomationRules = async (vehicles: Array<{ brand: string, model: string, quantity: number, year?: string }>) => {
  console.log('Applying automation rules for vehicles:', vehicles)
  
  const suggestedTrackers: Array<{ model: string, quantity: number }> = []
  let suggestedConfiguration = ''

  for (const vehicle of vehicles) {
    const rule = await findAutomationRule(vehicle.brand, vehicle.model, vehicle.year)

    if (rule) {
      console.log('Found automation rule:', rule)
      
      // Add suggested tracker
      const existingTracker = suggestedTrackers.find(t => t.model === rule.tracker_model)
      if (existingTracker) {
        existingTracker.quantity += vehicle.quantity
      } else {
        suggestedTrackers.push({
          model: rule.tracker_model,
          quantity: vehicle.quantity
        })
      }

      // Set configuration (use the first rule's configuration)
      if (!suggestedConfiguration) {
        suggestedConfiguration = rule.configuration
      }
    } else {
      console.log('No automation rule found for vehicle:', vehicle)
    }
  }

  return {
    trackers: suggestedTrackers,
    configuration: suggestedConfiguration
  }
}
