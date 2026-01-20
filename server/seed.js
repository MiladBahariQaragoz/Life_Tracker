const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MOCK_GYM_MOVES = [
    { pageIndex: 5, name: 'Bench Press', group: 'Push' },
    { pageIndex: 6, name: 'Overhead Press', group: 'Push' },
    { pageIndex: 10, name: 'Deadlift', group: 'Pull' },
    { pageIndex: 12, name: 'Barbell Row', group: 'Pull' },
    { pageIndex: 15, name: 'Squat', group: 'Legs' },
];

async function main() {
    console.log('Seeding database...');

    // Clear existing data
    await prisma.gymSet.deleteMany();
    await prisma.gymSession.deleteMany();
    await prisma.gymExercise.deleteMany();
    await prisma.gymPlan.deleteMany();
    await prisma.gymMoveReference.deleteMany();
    await prisma.studySession.deleteMany();
    await prisma.examTopic.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.task.deleteMany();

    // 0. Gym Moves Reference
    await prisma.gymMoveReference.createMany({
        data: MOCK_GYM_MOVES
    });
    console.log('Created Gym Moves Reference');

    // 1. Gym Data
    const plan = await prisma.gymPlan.create({
        data: {
            dayName: 'Chest Day (Test)',
            exercises: {
                create: [
                    {
                        id: 'bench-press',
                        name: 'Bench Press',
                        targetSets: 4,
                        targetReps: 8,
                        lastWeight: 100,
                        lastReps: 8
                    },
                    {
                        id: 'incline-dumbbell',
                        name: 'Incline Dumbbell Press',
                        targetSets: 3,
                        targetReps: 10,
                        lastWeight: 30,
                        lastReps: 10
                    }
                ]
            }
        }
    });
    console.log('Created Gym Plan:', plan.dayName);

    // 2. Study Data
    const exam = await prisma.exam.create({
        data: {
            name: 'Finals (Test)',
            date: new Date('2026-06-01'),
            topics: {
                create: [
                    {
                        name: 'Math',
                        totalSessionsGoal: 20
                    },
                    {
                        name: 'Physics',
                        totalSessionsGoal: 15
                    }
                ]
            }
        }
    });
    console.log('Created Exam:', exam.name);

    // 3. Task Data
    await prisma.task.createMany({
        data: [
            {
                title: 'Buy Groceries (Test)',
                priority: 'high',
                completed: false
            },
            {
                title: 'Walk the Dog (Test)',
                priority: 'medium',
                completed: true
            },
            {
                title: 'Read Book (Test)',
                priority: 'low',
                completed: false,
                dueDate: new Date()
            }
        ]
    });
    console.log('Created Tasks');

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
