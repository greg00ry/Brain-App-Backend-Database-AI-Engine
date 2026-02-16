import { runConsciousProcessor, runSubconsciousRoutine } from "../services/vaultProcessor.js"


export const runNightlyRoutine = async () => {
    await runSubconsciousRoutine()

    await runConsciousProcessor()
}