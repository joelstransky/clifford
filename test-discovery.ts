import { SprintRunner } from './src/utils/sprint';

const sprints = SprintRunner.discoverSprints();
console.log('Discovered Sprints:');
console.log(JSON.stringify(sprints, null, 2));

if (sprints.length > 0) {
    console.log(`✅ Found ${sprints.length} sprints.`);
} else {
    console.error('❌ No sprints found!');
    process.exit(1);
}
