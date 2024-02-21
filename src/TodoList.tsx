import React, { useEffect, useState } from "react"
import { db } from "./Firebase";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

type Task = {
    id: string, name: string, prev: string, next: string
}

function TodoList() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState("");
    
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
            const newID : string = Date.now().toString();
            if (tasks.length > 0) {
                const lastTask = tasks[tasks.length - 1];
                await setDoc(doc(db, "tasks", `${newID}`), {
                    id: newID,
                    name: newTask,
                    prev: lastTask.id,
                    next: ""
                });
                await setDoc(doc(db, "tasks", `${lastTask.id}`), {
                    id: lastTask.id,
                    name: lastTask.name,
                    prev: lastTask.prev,
                    next: newID
                });
            } else {
                await setDoc(doc(db, "tasks", `${newID}`), {
                    id: newID,
                    name: newTask,
                    prev: "",
                    next: ""
                });
            }
            setNewTask("");
            fetchAndSetTasks();
        }
    }

    async function deleteTask(task : Task) {
        if (task.prev !== "") {
            const prevTask : Task = tasks.find(t => Number(t.id) === Number(task.prev)) as Task;
            await setDoc(doc(db, "tasks", `${task.prev}`), {
                id: task.prev,
                name: prevTask.name, //do I have to update this?? If I don't, I don't have to run find here
                prev: prevTask.prev,
                next: task.next
            });
        }
        if (task.next !== "") {
            const nextTask : Task = tasks.find(t => Number(t.id) === Number(task.next)) as Task;
            await setDoc(doc(db, "tasks", `${task.next}`), {
                id: task.next,
                name: nextTask.name, //do I have to update this?? If I don't, I don't have to run find here
                prev: task.prev,
                next: nextTask.next
            });
        }
        await deleteDoc(doc(db, "tasks", `${task.id}`));
        fetchAndSetTasks();
    }

    async function handleOnDragEnd(result: DropResult)  {
        if (result.destination && result.source.index !== result.destination.index) {
            const movedTask : Task = tasks[result.source.index];
            const destinationTask : Task = tasks[result.destination.index];
            if (movedTask.prev !== "") {
                const prevTask : Task = tasks.find(t => Number(t.id) == Number(movedTask.prev)) as Task;
                await setDoc(doc(db, "tasks", `${prevTask.id}`), {
                    id: prevTask.id,
                    name: prevTask.name,
                    prev: prevTask.prev,
                    next: movedTask.next
                });
                prevTask.next = movedTask.next;
            }
            if (movedTask.next !== "") {
                const nextTask : Task = tasks.find(t => Number(t.id) == Number(movedTask.next)) as Task;
                await setDoc(doc(db, "tasks", `${nextTask.id}`), {
                    id: nextTask.id,
                    name: nextTask.name,
                    prev: movedTask.prev,
                    next: nextTask.next
                });
                nextTask.prev = movedTask.prev;
            }
            if (result.source.index < result.destination.index) {
                await setDoc(doc(db, "tasks", `${destinationTask.id}`), {
                    id: destinationTask.id,
                    name: destinationTask.name,
                    prev: destinationTask.prev,
                    next: movedTask.id
                });
                await setDoc(doc(db, "tasks", `${movedTask.id}`), {
                    id: movedTask.id,
                    name: movedTask.name,
                    prev: destinationTask.id,
                    next: destinationTask.next
                });
                if (destinationTask.next !== "") {
                    const nextTask : Task = tasks.find(t => Number(t.id) == Number(destinationTask.next)) as Task;
                    await setDoc(doc(db, "tasks", `${nextTask.id}`), {
                        id: nextTask.id,
                        name: nextTask.name,
                        prev: movedTask.id,
                        next: nextTask.next
                    });
                }
            } else {
                if (destinationTask.prev !== "") {
                    const prevTask : Task = tasks.find(t => Number(t.id) == Number(destinationTask.prev)) as Task;
                    await setDoc(doc(db, "tasks", `${prevTask.id}`), {
                        id: prevTask.id,
                        name: prevTask.name,
                        prev: prevTask.prev,
                        next: movedTask.id
                    });
                }  
                await setDoc(doc(db, "tasks", `${movedTask.id}`), {
                    id: movedTask.id,
                    name: movedTask.name,
                    prev: destinationTask.prev,
                    next: destinationTask.id
                });
                await setDoc(doc(db, "tasks", `${destinationTask.id}`), {
                    id: destinationTask.id,
                    name: destinationTask.name,
                    prev: movedTask.id,
                    next: destinationTask.next
                });              
            }

            fetchAndSetTasks();            
        }
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