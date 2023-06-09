import {Futoshiki} from "../build/module/lib/futoshiki.js";

// let futo = new Futoshiki(4)

// Niveau 1
// futo.addConstraints([
// 	[2,0,3,0],
// 	[1,1,1,0],
// 	[2,1,2,0],
// 	[2,2,1,2],
// 	[3,2,3,3]
// ])

// Niveau 3
// futo.addValues([
// 	[0,0,3],
// 	[3,2,3],
// 	[3,3,2]
// ], true)
// futo.addConstraints([
// 	[1,0,0,0],
// 	[3,0,3,1],
// 	[0,1,0,2],
// 	[2,2,2,1],
// ])

// let futo = new Futoshiki(5)
// futo.addValues([
// 	[2,0,3],
// 	[4,0,1],
// 	[3,1,3],
// 	[4,1,4],
// 	[4,2,3]
// ], true)
//
// futo.addConstraints([
// 	[0,1,0,2],
// 	[1,0,0,0],
// 	[1,2,1,3],
// 	[2,3,2,4],
// 	[3,2,3,3],
// 	[0,4,0,3],
// 	[4,4,3,4]
// ])

let futo = new Futoshiki(4)
// futo
// 	.addValues([
// 		[3, 1, 2],
// 		[0, 2, 4],
// 		[2, 3, 3]
// 	])
// 	.addConstraints([[1, 1, 0, 1]])
futo.generate(6)

try {
	console.log('FUTOSHIKI GENERATED')
	futo.solve()
} catch {
}

console.log(futo.generateSteps)
document.getElementById('output').innerHTML = futo.solveSteps[0]

document.getElementById('generate-solution').innerHTML = futo.generateSteps.solution
document.getElementById('generate-init').innerHTML = futo.generateSteps.init
document.getElementById('generate-optimize').innerHTML = futo.generateSteps.optimized


