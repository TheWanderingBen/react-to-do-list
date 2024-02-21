import React, { useEffect, useState } from "react"
import { db } from "./Firebase";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";

type Task = {
    id: string, name: string, prev: string, next: string
}

function TodoList() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState("");
    let currentX = 0;
    let currentY = 0;
    let currentTarget : HTMLElement;
    let elementBelowDrag : Element;

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

    async function moveTaskUp(task : Task) {
        if (task.prev !== "") {
            const prevTask : Task = tasks.find(t => Number(t.id) == Number(task.prev)) as Task;
            if (prevTask.prev !== "") {
                const prevPrevTask : Task = tasks.find(t => Number(t.id) == Number(prevTask.prev)) as Task;
                await setDoc(doc(db, "tasks", `${prevPrevTask.id}`), {
                    id: prevPrevTask.id,
                    name: prevPrevTask.name,
                    prev: prevPrevTask.prev,
                    next: task.id
                });
            }
            await setDoc(doc(db, "tasks", `${task.id}`), {
                id: task.id,
                name: task.name,
                prev: prevTask.prev,
                next: prevTask.id
            });
            await setDoc(doc(db, "tasks", `${prevTask.id}`), {
                id: prevTask.id,
                name: prevTask.name,
                prev: task.id,
                next: task.next
            });
            if (task.next !== "") {
                const nextTask : Task = tasks.find(t => Number(t.id) == Number(task.next)) as Task;
                await setDoc(doc(db, "tasks", `${nextTask.id}`), {
                    id: nextTask.id,
                    name: nextTask.name,
                    prev: prevTask.id,
                    next: nextTask.next
                });
            }
            
            fetchAndSetTasks();
        }
    }

    async function moveTaskDown(task : Task) {
        if (task.next !== "") {
            const nextTask : Task = tasks.find(t => Number(t.id) == Number(task.next)) as Task;
            if (task.prev !== "") {
                const prevTask : Task = tasks.find(t => Number(t.id) == Number(task.prev)) as Task;
                await setDoc(doc(db, "tasks", `${prevTask.id}`), {
                    id: prevTask.id,
                    name: prevTask.name,
                    prev: prevTask.prev,
                    next: task.next
                });
            }
            await setDoc(doc(db, "tasks", `${nextTask.id}`), {
                id: nextTask.id,
                name: nextTask.name,
                prev: task.prev,
                next: task.id
            });
            await setDoc(doc(db, "tasks", `${task.id}`), {
                id: task.id,
                name: task.name,
                prev: nextTask.id,
                next: nextTask.next
            });
            if (nextTask.next !== "") {
                const nextNextTask : Task = tasks.find(t => Number(t.id) == Number(nextTask.next)) as Task;
                await setDoc(doc(db, "tasks", `${nextNextTask.id}`), {
                    id: nextNextTask.id,
                    name: nextNextTask.name,
                    prev: task.id,
                    next: nextNextTask.next
                });
            }

            fetchAndSetTasks();
        }
    }

    function addPaddingBelowTask(task : Task) {
        if (task.next !== "") {
            const element = document.getElementById(task.next);
            if (element) {
                elementBelowDrag = element;
                elementBelowDrag.className = "below-moving-first"; 
            }
        }
    }

    function addPaddingToElement(element : Element) {
        elementBelowDrag.className = "";
        elementBelowDrag = element;
        elementBelowDrag.className = "below-moving"; 
    }

    function dragStart(e: React.DragEvent<HTMLLIElement>, task : Task) {
        console.log("picked up: " + task.id);
        currentX = e.clientX;
        currentY = e.clientY;
        e.currentTarget.style.top = (e.currentTarget.offsetTop) + "px";
        e.currentTarget.style.left = (e.currentTarget.offsetLeft) + "px";
        e.currentTarget.className = "moving";
        currentTarget = e.currentTarget;
        addPaddingBelowTask(task);
    }

    function dragOver(e: React.DragEvent<HTMLLIElement>) {
        e.preventDefault(); //this prevents the element moving back to where it was
        document.elementsFromPoint(e.clientX, e.clientY).forEach((element) => {
            if (element.id != elementBelowDrag.id && element.id != e.currentTarget.id && element.localName === "li") {
                addPaddingToElement(element);
            }
        });
    }

    function drag(e: React.DragEvent<HTMLLIElement>) {
        e.preventDefault();
        const xMove = currentX - e.clientX;
        const yMove = currentY - e.clientY;
        currentX = e.clientX;
        currentY = e.clientY;
        e.currentTarget.style.top = (e.currentTarget.offsetTop - yMove) + "px";
        e.currentTarget.style.left = (e.currentTarget.offsetLeft - xMove) + "px";
        
    }

    function dragEnd(e: React.DragEvent<HTMLLIElement>) {
        e.currentTarget.style.top = e.currentTarget.offsetTop + "px";
        e.currentTarget.style.left = e.currentTarget.offsetLeft + "px";
        elementBelowDrag.className = ""; 
        e.currentTarget.className = "";
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
        <ol>
            {tasks.map((task, index) => 
                <li key={index} draggable="true" id={task.id} 
                    onDragStart={(e) => dragStart(e, task)}
                    onDragOver={dragOver}
                    onDrag={drag}
                    onDragEnd={dragEnd}>
                    <div className="drag-indicator">
                        &#8801;
                    </div>
                    <span className="text">{task.name}</span>
                    <button 
                        className="delete-button" 
                        onClick={() => deleteTask(task)}>
                        X
                    </button>
                    <button 
                        className="move-button" 
                        onClick={() => moveTaskUp(task)}
                        disabled={index === 0}>
                        ☝️
                    </button>
                    <button 
                        className="move-button" 
                        onClick={() => moveTaskDown(task)}
                        disabled={index === tasks.length - 1}>
                        👇
                    </button>
                </li>
            )}
            <li draggable="true" id="fake" 
                onDragOver={dragOver}>
            </li>
        </ol>
    </div>)
}

export default TodoList;