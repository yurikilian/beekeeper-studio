
import a from './20200101'
import b from './20200422'
import c from './20200514'
import d from './20200517'
import createSettings from './20200624_create_settings'
import dev1 from './dev-1'
import dev2 from './dev-2'
import domains from './20200519'
import createLogger from '../lib/logger'

const logger = createLogger('migrations')()

const setupSQL = `
 CREATE TABLE IF NOT EXISTS BK_MIGRATIONS(
   name VARCHAR(255) PRIMARY KEY NOT NULL,
   run_at datetime NOT NULL DEFAULT (datetime('now'))
 )
`
const realMigrations = [
  a, b, c, d, domains, createSettings
]

const devMigrations = [
  dev1, dev2
]

const migrations = realMigrations.concat(devMigrations)

const Manager = {
  ceQuery: "select name from bk_migrations where name = ?",
  meQuery: "INSERT INTO bk_migrations(name) values (?)",

  async checkExists(runner, name) {
    const result = await runner.query(this.ceQuery, [name])
    return result.length > 0
  },
  async markExists(runner, name) {
    const result = await runner.query(this.meQuery, [name])
    return !!result
  }
}


export default class {
  constructor(connection, env) {
    this.connection = connection
    this.env = env
  }

  async run() {
    console.log("running migrations")
    const runner = this.connection.connection.createQueryRunner()
    await runner.query(setupSQL)
    try  {
      // await runner.startTransaction()
      for(let i = 0; i < migrations.length; i++){
        const migration = migrations[i]
        logger.debug(`Checking migration ${migration.name}`)
        if(migration.env && migration.env !== this.env) {
          // env defined, and does not match
          logger.debug(`Skipping ${migration.name} in ${this.env}, required ${migration.env} `)
          continue
        }
        const hasRun = await Manager.checkExists(runner, migration.name)
        if (!hasRun) {
          await migration.run(runner, this.env)
          await Manager.markExists(runner, migration.name)
        }
      }
      // await runner.commitTransaction()
    } catch (e) {
      // await runner.rollbackTransaction()
      throw e
    } finally {
      // await runner.release()
    }
  }

}
