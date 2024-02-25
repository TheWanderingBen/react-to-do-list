import React, { useEffect, useState } from "react"
import { db } from "./Firebase";
import { collection, deleteDoc, doc, getDocs, writeBatch } from "firebase/firestore";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

type Task = {
    id: string, name: string, prev: string, next: string
}

function TodoList() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState<string>("");
    const [editingTaskString, setEditingTaskString] = useState<string>("");
    const [editingTask, setEditingTask] = useState<Task>();
    const [isEditing, setIsEditing] = useState<boolean>(false);
    
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

        orderAndSetTasks(dbTasks);
    }
    
    function orderAndSetTasks(dbTasks: Task[]) {
        let orderedTasks: Task[] = [];
        if (dbTasks.length > 0) {
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
        setIsEditing(false);
    }

    function handleAddKeyDown(event : React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            addTask();
        } else if (event.key === 'Escape') {
            setNewTask("");
        }
    }

    async function addTask() {
        setIsEditing(false);
        if (newTask.trim() !== "") {
            const changingTasks = tasks;
            const tasksToUpdate : Task[] = [];
            const newID : string = Date.now().toString();
            if (tasks.length > 0) {
                const lastTask : Task = changingTasks[tasks.length - 1];
                const addedTask : Task = { id: newID, name: newTask, prev: lastTask.id, next: "" };
                lastTask.next = newID;
                tasksToUpdate.push(lastTask, addedTask);
                changingTasks.push(addedTask);
            } else {
                const addedTask : Task = { id: newID, name: newTask, prev: "", next: "" };
                tasksToUpdate.push(addedTask);
                changingTasks.push(addedTask);
            }
            orderAndSetTasks(changingTasks);
            setNewTask("");
            await updateDocsWithTasks(tasksToUpdate);
            fetchAndSetTasks();
        }
    }

    async function deleteTask(task : Task) {
        setIsEditing(false);
        const changingTasks = tasks;
        const tasksToUpdate : Task[] = [];
        if (task.prev !== "") {
            const prevTask : Task = changingTasks.find(t => Number(t.id) === Number(task.prev)) as Task;
            prevTask.next = task.next;
            tasksToUpdate.push(prevTask);
        }
        if (task.next !== "") {
            const nextTask : Task = changingTasks.find(t => Number(t.id) === Number(task.next)) as Task;
            nextTask.prev = task.prev;
            tasksToUpdate.push(nextTask);
        }
        changingTasks.splice(changingTasks.indexOf(task), 1);
        orderAndSetTasks(changingTasks);
        await updateDocsWithTasks(tasksToUpdate);    
        await deleteDoc(doc(db, "tasks", `${task.id}`));
        fetchAndSetTasks();
    }

    async function handleOnDragEnd(result: DropResult)  {
        setIsEditing(false);
        if (result.destination && result.source.index !== result.destination.index) {
            const changingTasks = tasks;            
            const movedTask : Task = changingTasks[result.source.index];
            const destinationTask : Task = changingTasks[result.destination.index];
            let tasksToUpdate : Task[] = [ movedTask, destinationTask ];
            if (movedTask.prev !== "") {
                const prevTask : Task = changingTasks.find(t => Number(t.id) == Number(movedTask.prev)) as Task;
                prevTask.next = movedTask.next;
                tasksToUpdate.push(prevTask);
            }
            if (movedTask.next !== "") {
                const nextTask : Task = changingTasks.find(t => Number(t.id) == Number(movedTask.next)) as Task;
                nextTask.prev = movedTask.prev;
                tasksToUpdate.push(nextTask);
            }
            if (result.source.index < result.destination.index) {
                if (destinationTask.next !== "") {
                    const nextTask : Task = changingTasks.find(t => Number(t.id) == Number(destinationTask.next)) as Task;
                    nextTask.prev = movedTask.id;
                    if (!tasksToUpdate.includes(nextTask))
                        tasksToUpdate.push(nextTask);
                }
                movedTask.prev = destinationTask.id;
                movedTask.next = destinationTask.next;
                destinationTask.next = movedTask.id;
            } else {
                if (destinationTask.prev !== "") {
                    const prevTask : Task = changingTasks.find(t => Number(t.id) == Number(destinationTask.prev)) as Task;
                    prevTask.next = movedTask.id;
                    if (!tasksToUpdate.includes(prevTask))
                        tasksToUpdate.push(prevTask);
                }  
                movedTask.prev = destinationTask.prev;
                movedTask.next = destinationTask.id;
                destinationTask.prev = movedTask.id;            
            }
            
            orderAndSetTasks(changingTasks);
            await updateDocsWithTasks(tasksToUpdate);
            fetchAndSetTasks();
        }
    }  


    function handleOnDragStart()  {
        setIsEditing(false);
    }

    function editName(task : Task) {
        setIsEditing(true);
        setEditingTask(task);
        setEditingTaskString(task.name);
    }
    
    function handleEditInputChange(event: React.ChangeEvent<HTMLInputElement>) {
        setEditingTaskString(event.target.value);
    }

    async function handleEditKeyDown(event : React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            setIsEditing(false);
            editingTask!.name = editingTaskString;
            orderAndSetTasks([...tasks]);
            await updateDocsWithTasks([editingTask as Task]);
            fetchAndSetTasks();
        } else if (event.key === 'Escape') {
            setIsEditing(false);
        }
    }

    async function updateDocsWithTasks(tasksToUpdate: Task[]) {
        const batch = writeBatch(db);
        for (let i : number = 0; i < tasksToUpdate.length; ++i) {
            const task : Task = tasksToUpdate[i];
            const taskRef = doc(db, "tasks", `${task.id}`);
            batch.set(taskRef, { id: task.id, 
                                name: task.name,
                                prev: task.prev,
                                next: task.next});
        }

        return await batch.commit();
    }

    return(<div className="to-do-list">
        <h1>My Tasks</h1>
        <div className="add-parent">
            <input
                type="text" placeholder="Enter a task..." value={newTask} onChange={handleInputChange} onKeyDown={handleAddKeyDown} 
            />
        </div>``
        <DragDropContext onDragEnd={handleOnDragEnd} onDragStart={handleOnDragStart}>
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
                                        {isEditing && task == editingTask ? 
                                            <input type="text" value={editingTaskString} onChange={handleEditInputChange} onKeyDown={handleEditKeyDown} autoFocus/> :
                                            <span className="text" onClick={ () => editName(task) }>{task.name}</span>
                                        }
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