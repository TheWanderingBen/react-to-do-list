import React, { useEffect, useState } from "react"
import { db } from "./Firebase";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

type Task = {
    id: string, name: string, prev: string, next: string
}

function TodoList() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState<string>("");
    
    useEffect(() => {
        fetchAndSetTasks();
    }, [])

    async function fetchAndSetTasks() {
        const snapshot = await getDocs(collection(db, "tasks"));
        const dbTasks : Task[] = snapshot.docs.map(doc => { 
            return { 
                id: doc.data()["id"] as string,
                name: doc.data()["name"] as string,
                prev: doc.data()["prev"] as string,
                next: doc.data()["next"] as string };
        });

        let orderedTasks : Task[] = [];
        if (dbTasks.length > 0)
        {
            orderedTasks[0] = dbTasks.find(t => t.prev === "") as Task;
            let nextTaskID = orderedTasks[0].next;
            let index = 1;
            while (nextTaskID !== "") {
                //seems like a better solution exists here that isn't find, but I'm sick!
                //Also under why this comparison was failing before casting both sides to number — they're both strings!
                orderedTasks[index] = dbTasks.find(t => Number(t.id) === Number(nextTaskID)) as Task; 
                nextTaskID = orderedTasks[index].next;
                ++index;
            }
        }

        setTasks(orderedTasks);
    }
    
    function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
        setNewTask(event.target.value);
    }

    async function addTask() {
        if (newTask.trim() !== "") {
            const tasksToUpdate : Task[] = [];
            const newID : string = Date.now().toString();
            if (tasks.length > 0) {
                const lastTask : Task = tasks[tasks.length - 1];
                const addedTask : Task = { id: newID, name: newTask, prev: lastTask.id, next: "" };
                lastTask.next = newID;
                tasksToUpdate.push(lastTask, addedTask);
            } else {
                const addedTask : Task = { id: newID, name: newTask, prev: "", next: "" };
                tasksToUpdate.push(addedTask);
            }
            updateDocsWithTasks(tasksToUpdate);
            setNewTask("");
            fetchAndSetTasks();
        }
    }

    async function deleteTask(task : Task) {
        const tasksToUpdate : Task[] = [];
        if (task.prev !== "") {
            const prevTask : Task = tasks.find(t => Number(t.id) === Number(task.prev)) as Task;
            prevTask.next = task.next;
            tasksToUpdate.push(prevTask);
        }
        if (task.next !== "") {
            const nextTask : Task = tasks.find(t => Number(t.id) === Number(task.next)) as Task;
            nextTask.prev = task.prev;
            tasksToUpdate.push(nextTask);
        }
        updateDocsWithTasks(tasksToUpdate);    
        await deleteDoc(doc(db, "tasks", `${task.id}`));
        fetchAndSetTasks();
    }

    function handleOnDragEnd(result: DropResult)  {
        if (result.destination && result.source.index !== result.destination.index) {
            const movedTask : Task = tasks[result.source.index];
            const destinationTask : Task = tasks[result.destination.index];
            let tasksToUpdate : Task[] = [ movedTask, destinationTask ];
            if (movedTask.prev !== "") {
                const prevTask : Task = tasks.find(t => Number(t.id) == Number(movedTask.prev)) as Task;
                prevTask.next = movedTask.next;
                tasksToUpdate.push(prevTask);
            }
            if (movedTask.next !== "") {
                const nextTask : Task = tasks.find(t => Number(t.id) == Number(movedTask.next)) as Task;
                nextTask.prev = movedTask.prev;
                tasksToUpdate.push(nextTask);
            }
            if (result.source.index < result.destination.index) {
                if (destinationTask.next !== "") {
                    const nextTask : Task = tasks.find(t => Number(t.id) == Number(destinationTask.next)) as Task;
                    nextTask.prev = movedTask.id;
                    if (!tasksToUpdate.includes(nextTask))
                        tasksToUpdate.push(nextTask);
                }
                movedTask.prev = destinationTask.id;
                movedTask.next = destinationTask.next;
                destinationTask.next = movedTask.id;
            } else {
                if (destinationTask.prev !== "") {
                    const prevTask : Task = tasks.find(t => Number(t.id) == Number(destinationTask.prev)) as Task;
                    prevTask.next = movedTask.id;
                    if (!tasksToUpdate.includes(prevTask))
                        tasksToUpdate.push(prevTask);
                }  
                movedTask.prev = destinationTask.prev;
                movedTask.next = destinationTask.id;
                destinationTask.prev = movedTask.id;            
            }
            
            updateDocsWithTasks(tasksToUpdate);        
        }
    }    

    function updateDocsWithTasks(tasksToUpdate: Task[]) {
        tasksToUpdate.forEach(async task => {
            await setDoc(doc(db, "tasks", `${task.id}`), {
                id: task.id,
                name: task.name,
                prev: task.prev,
                next: task.next
            });
        });
        fetchAndSetTasks();
    }

    return(<div className="to-do-list">
        <h1>My Tasks</h1>
        <div>
            <input
                type="text"
                placeholder="Enter a task..."
                value={newTask}
                onChange={handleInputChange}
            />
            <button
                className="add-button"
                onClick={addTask}>
                    Add
            </button>
        </div>
        <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="tasks">
                {(provided) =>
                    <ol className="tasks" {...provided.droppableProps} ref={provided.innerRef}>
                        {tasks.map((task, index) => {
                            return (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided) => (
                                    <li ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                        <div className="drag-indicator">
                                            &#8801;
                                        </div>
                                        <span className="text">{task.name}</span>
                                        <button 
                                            className="delete-button" 
                                            onClick={() => deleteTask(task)}>
                                            X
                                        </button>
                                    </li>
                                )}
                                </Draggable>
                            )}
                        )}
                        {provided.placeholder}
                    </ol>
                }
            </Droppable>
        </DragDropContext>
    </div>)
}

export default TodoList;