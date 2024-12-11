from fastapi import FastAPI, Form, Body
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
import torch
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from fastapi.middleware.cors import CORSMiddleware
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

load_dotenv()

def vector_store(top_k=5):
    # Connect to Qdrant cloud
    retriever = QdrantVectorStore.from_existing_collection(
        embedding=embeddings,
        collection_name="medical_embeddings",
        url="https://fe1add48-1ae9-4816-9ab8-6ecadf8c93d6.us-west-2-0.aws.cloud.qdrant.io:6333",
        api_key=os.getenv("QDRANT_API_KEY"),
    ).as_retriever(search_type="mmr", search_kwargs={"k": top_k})
    return retriever

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY")
)

model_name = "abhinand/MedEmbed-large-v0.1"
model_kwargs = {'device': 'cpu'}
encode_kwargs = {'normalize_embeddings': False}

embeddings = HuggingFaceEmbeddings(
    model_name=model_name,
    model_kwargs=model_kwargs,
    encode_kwargs=encode_kwargs
)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get('/')
async def home():
    return {
        "message": "All Okay"
    }


@app.post("/infer")
def infer_diagnosis(request_body: dict = Body(...)):
    user_input = request_body.get("user_input","")
    user_input = user_input.get("content")
    template = '''
    You're a compassionate AI doctor designed to help users with medical inquiries. Your primary goal is to provide accurate medical advice, recommend treatment options for various health conditions, and prioritize the well-being of individuals seeking assistance. In this particular task, your objective is to diagnose a medical condition and suggest treatment options to the user. You will be provided with the user's query, and relevant context to make an accurate assessment. Remember, if there's any uncertainty or the condition is complex, always advise the user to seek professional medical help promptly. \
    Please be thorough in your assessment and ensure that your recommendations are based on the provided context. If the context does not match the query, you can say that you don't have the expertise to deal with the issue. Your responses should be clear and informative. Your guidance could potentially have a significant impact on someone's health, so accuracy and empathy are crucial in your interactions with users. \

    Context: {context}

    Here is the question: {user_input}
    '''

    retriever = vector_store()

    prompt = ChatPromptTemplate.from_template(
            template
    )

    runnable = (
        {"context": retriever | format_docs ,"user_input": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    result = runnable.invoke(user_input)

    return JSONResponse(content={"message": result})